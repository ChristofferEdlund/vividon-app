import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { userProfiles, generations, creditTransactions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { validateApiKey } from "@/lib/api-keys"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

// Credit costs per quality tier
const CREDIT_COSTS = {
  fast: 1,      // 1K output
  balanced: 3,  // 2K output
  quality: 6,   // 4K output
}

// Model mapping
const MODEL_MAP = {
  fast: "gemini-2.0-flash-exp",
  balanced: "gemini-2.0-flash-exp",
  quality: "gemini-2.0-flash-exp",
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized - Bearer token required" }, { status: 401 })
    }

    const token = authHeader.slice(7)

    let userId: string
    let userProfile: typeof userProfiles.$inferSelect | null = null

    // Check if token is an API key (starts with "viv_") or a session token
    if (token.startsWith("viv_")) {
      // API key authentication (from plugin)
      const validation = await validateApiKey(token)
      if (!validation) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
      }
      userId = validation.user.id
      userProfile = validation.user
    } else {
      // Session-based authentication (from web)
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      userId = user.id

      // Get user profile
      const profiles = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, userId))

      userProfile = profiles[0] || null

      // Create profile if doesn't exist
      if (!userProfile) {
        const newProfiles = await db
          .insert(userProfiles)
          .values({
            id: userId,
            email: user.email || "",
            creditsRemaining: 10, // Free starter credits
          })
          .returning()
        userProfile = newProfiles[0]
      }
    }

    // Rate limit check
    const rateLimitResponse = await checkRateLimit(request, RATE_LIMITS.generate, userId)
    if (rateLimitResponse) return rateLimitResponse

    // Check if user is approved and not blocked
    if (!userProfile!.isApproved) {
      return NextResponse.json(
        { error: "Account not approved. Please wait for beta access." },
        { status: 403 }
      )
    }

    if (userProfile!.isBlocked) {
      return NextResponse.json(
        { error: "Account has been suspended." },
        { status: 403 }
      )
    }

    // Check global kill switch
    if (process.env.GENERATION_ENABLED === "false") {
      return NextResponse.json(
        { error: "Generation is temporarily disabled." },
        { status: 503 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      inputFileUri,
      inputBase64,
      inputMimeType = "image/png",
      prompt,
      aspectRatio = "1:1",
      qualityTier = "balanced",
      referenceImageUri,
      referenceBase64,
    } = body

    // Require either URI or base64
    if (!inputFileUri && !inputBase64) {
      return NextResponse.json(
        { error: "Missing required field: inputFileUri or inputBase64" },
        { status: 400 }
      )
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing required field: prompt" },
        { status: 400 }
      )
    }

    // Check credits
    const creditCost = CREDIT_COSTS[qualityTier as keyof typeof CREDIT_COSTS] || 3
    if (userProfile!.creditsRemaining < creditCost) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          creditsRemaining: userProfile!.creditsRemaining,
          creditCost,
        },
        { status: 402 }
      )
    }

    // Create generation record
    const model = MODEL_MAP[qualityTier as keyof typeof MODEL_MAP] || MODEL_MAP.balanced

    const [generation] = await db
      .insert(generations)
      .values({
        userId,
        modelUsed: model,
        qualityTier,
        creditsCost: creditCost,
        status: "processing",
        inputFileUri: inputFileUri || "base64-upload",
        prompt,
        metadata: { aspectRatio, referenceImageUri },
      })
      .returning()

    try {
      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const geminiModel = genAI.getGenerativeModel({ model })

      // Build content parts
      const parts: any[] = []

      // Add input image
      if (inputFileUri) {
        parts.push({
          fileData: {
            mimeType: inputMimeType,
            fileUri: inputFileUri,
          },
        })
      } else if (inputBase64) {
        parts.push({
          inlineData: {
            mimeType: inputMimeType,
            data: inputBase64,
          },
        })
      }

      // Add reference image if provided
      if (referenceImageUri) {
        parts.push({
          fileData: {
            mimeType: "image/png",
            fileUri: referenceImageUri,
          },
        })
      } else if (referenceBase64) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: referenceBase64,
          },
        })
      }

      // Add prompt
      parts.push({ text: prompt })

      // Generate
      const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["image", "text"],
        } as any,
      })

      const response = result.response
      const candidate = response.candidates?.[0]

      if (!candidate?.content?.parts) {
        throw new Error("No response from Gemini")
      }

      // Find image in response
      const imagePart = candidate.content.parts.find(
        (part: any) => part.inlineData?.mimeType?.startsWith("image/")
      )

      if (!imagePart?.inlineData) {
        throw new Error("No image in Gemini response")
      }

      // Deduct credits
      await db
        .update(userProfiles)
        .set({
          creditsRemaining: userProfile!.creditsRemaining - creditCost,
          creditsUsedTotal: userProfile!.creditsUsedTotal + creditCost,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.id, userId))

      // Record transaction
      await db.insert(creditTransactions).values({
        userId,
        amount: -creditCost,
        type: "usage",
        generationId: generation.id,
        description: `Generation: ${qualityTier} quality`,
      })

      // Update generation record
      await db
        .update(generations)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(generations.id, generation.id))

      return NextResponse.json({
        success: true,
        generationId: generation.id,
        image: {
          data: imagePart.inlineData.data,
          mimeType: imagePart.inlineData.mimeType,
        },
        creditsUsed: creditCost,
        creditsRemaining: userProfile!.creditsRemaining - creditCost,
      })
    } catch (genError: any) {
      // Update generation as failed
      await db
        .update(generations)
        .set({
          status: "failed",
          errorMessage: genError.message,
          completedAt: new Date(),
        })
        .where(eq(generations.id, generation.id))

      throw genError
    }
  } catch (error: any) {
    console.error("Generate API error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ status: "Generate API is running" })
}
