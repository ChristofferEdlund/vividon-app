import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"
import { db, userProfiles, generations, creditTransactions } from "@/lib/db"
import { eq } from "drizzle-orm"

// Credit costs per quality tier
const CREDIT_COSTS = {
  cheap: 1, // Flash 1K
  balanced: 5, // Pro 2K
  quality: 15, // Pro 4K
}

// Model mapping
const MODEL_MAP = {
  cheap: "gemini-2.5-flash-preview-04-17",
  balanced: "gemini-2.0-flash-exp",
  quality: "gemini-2.0-flash-exp",
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization header (API key from plugin)
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const apiKey = authHeader.slice(7)

    // For now, validate against Supabase auth
    // TODO: Add API key validation for plugin authentication
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Parse request body
    const body = await request.json()
    const {
      inputFileUri,
      prompt,
      aspectRatio = "1:1",
      qualityTier = "balanced",
      referenceImageUri,
    } = body

    if (!inputFileUri || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: inputFileUri, prompt" },
        { status: 400 }
      )
    }

    // Get user profile and check credits
    let userId: string
    let userProfile: typeof userProfiles.$inferSelect | null = null

    if (user) {
      userId = user.id
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

      // Check credits
      const creditCost = CREDIT_COSTS[qualityTier as keyof typeof CREDIT_COSTS] || 5
      if (userProfile.creditsRemaining < creditCost) {
        return NextResponse.json(
          {
            error: "Insufficient credits",
            creditsRemaining: userProfile.creditsRemaining,
            creditCost,
          },
          { status: 402 }
        )
      }
    } else {
      // Anonymous/API key user - for now, use a placeholder
      // TODO: Implement proper API key authentication
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Create generation record
    const creditCost = CREDIT_COSTS[qualityTier as keyof typeof CREDIT_COSTS] || 5
    const model = MODEL_MAP[qualityTier as keyof typeof MODEL_MAP] || MODEL_MAP.balanced

    const [generation] = await db
      .insert(generations)
      .values({
        userId,
        modelUsed: model,
        qualityTier,
        creditsCost: creditCost,
        status: "processing",
        inputFileUri,
        prompt,
        metadata: { aspectRatio, referenceImageUri },
      })
      .returning()

    try {
      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const geminiModel = genAI.getGenerativeModel({ model })

      // Build content parts
      const parts: any[] = [
        {
          fileData: {
            mimeType: "image/png",
            fileUri: inputFileUri,
          },
        },
      ]

      if (referenceImageUri) {
        parts.push({
          fileData: {
            mimeType: "image/png",
            fileUri: referenceImageUri,
          },
        })
      }

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
