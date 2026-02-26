import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai"
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

// Single model for all tiers
const GENERATION_MODEL = "gemini-3-pro-image-preview"

// Image size per quality tier (undefined = model default / 1K)
const IMAGE_SIZE_MAP: Record<string, string | undefined> = {
  fast: undefined,
  balanced: "2K",
  quality: "4K",
}

// ── Prompt instructions (mirrored from plugin constants) ──

const SYSTEM_INSTRUCTION = `You are a professional image retouching model specializing in lighting adjustments.

CRITICAL CONSTRAINTS:
• Preserve geometry and composition EXACTLY - no warping, distortion, or perspective changes
• Do NOT add, remove, or modify any objects, subjects, or elements
• Do NOT change identity, pose, facial features, body proportions, or expressions
• Do NOT alter text, logos, signs, or any readable content
• Do NOT crop, zoom, pan, or change framing
• Keep all edges, boundaries, and spatial relationships identical

ALLOWED CHANGES:
• Lighting direction, intensity, and quality
• Color temperature and color grading (warm/cool tones)
• Exposure, brightness, and contrast
• Shadow depth and highlight intensity
• Atmospheric effects (haze, glow, ambient light)

OUTPUT REQUIREMENT: The result must be pixel-aligned with the input - same composition, same structure, only lighting differs.`

const DETAIL_PRESERVATION_SUFFIX =
  " IMPORTANT: Preserve all details, textures, composition, subjects, and structure exactly. Only change the lighting as described. Keep the scene pixel-aligned - no cropping, no zoom, no warping, no perspective change."

const NAME_INSTRUCTION =
  " First, output exactly one line: NAME: <a 2-5 word title for this lighting effect>. Then edit the provided image with the requested lighting change."

// All safety categories turned off (professional image editing use case)
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.OFF },
]

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
      suggestName = false,
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
    const [generation] = await db
      .insert(generations)
      .values({
        userId,
        modelUsed: GENERATION_MODEL,
        qualityTier,
        creditsCost: creditCost,
        status: "processing",
        inputFileUri: inputFileUri || "base64-upload",
        prompt,
        metadata: { aspectRatio, referenceImageUri },
      })
      .returning()

    try {
      // Initialize Gemini (new SDK)
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

      // Build content parts with proper labeling for style transfer
      const hasReference = !!(referenceImageUri || referenceBase64)
      const parts: any[] = []

      // Input image (with label if style transfer)
      if (hasReference) {
        parts.push({ text: "TARGET IMAGE (preserve this content exactly):" })
      }
      if (inputFileUri) {
        parts.push({ fileData: { mimeType: inputMimeType, fileUri: inputFileUri } })
      } else if (inputBase64) {
        parts.push({ inlineData: { mimeType: inputMimeType, data: inputBase64 } })
      }

      // Reference image (style transfer only)
      if (hasReference) {
        parts.push({ text: "REFERENCE IMAGE (copy lighting style from this):" })
        if (referenceImageUri) {
          parts.push({ fileData: { mimeType: "image/png", fileUri: referenceImageUri } })
        } else if (referenceBase64) {
          parts.push({ inlineData: { mimeType: "image/png", data: referenceBase64 } })
        }
      }

      // Prompt with detail preservation suffix (+ name instruction when requested)
      parts.push({ text: `${prompt}${DETAIL_PRESERVATION_SUFFIX}${suggestName ? NAME_INSTRUCTION : ""}` })

      // Build image config
      const imageSize = IMAGE_SIZE_MAP[qualityTier]
      const imageConfig: Record<string, string> = { aspectRatio }
      if (imageSize) {
        imageConfig.imageSize = imageSize
      }

      // Log what we're sending to Gemini (structure only, no base64 data)
      console.log("[Gemini request]", JSON.stringify({
        model: GENERATION_MODEL,
        partsStructure: parts.map((p: any) => ({
          hasText: !!p.text,
          textPreview: p.text?.slice(0, 80),
          hasInlineData: !!p.inlineData,
          inlineDataMime: p.inlineData?.mimeType,
          inlineDataSize: p.inlineData?.data?.length,
          hasFileData: !!p.fileData,
        })),
        responseModalities: suggestName ? ["text", "image"] : ["image"],
        imageConfig,
        hasReference,
        qualityTier,
      }))

      // Generate with full config (system instruction, safety, thinking)
      const response = await ai.models.generateContent({
        model: GENERATION_MODEL,
        contents: [{ role: "user", parts }],
        systemInstruction: SYSTEM_INSTRUCTION,
        config: {
          responseModalities: suggestName ? ["text", "image"] : ["image"],
          safetySettings: SAFETY_SETTINGS,
          ...({ imageConfig } as any),
        },
      } as any)

      const candidate = response.candidates?.[0]

      if (!candidate?.content?.parts) {
        const finishReason = candidate?.finishReason
        console.error("Gemini returned no parts. finishReason:", finishReason, "candidate:", JSON.stringify(candidate, null, 2))
        throw new Error(`No response from Gemini (finishReason: ${finishReason || "unknown"})`)
      }

      // Find image in response
      const imagePart = candidate.content.parts.find(
        (part: any) => part.inlineData?.mimeType?.startsWith("image/")
      )

      if (!imagePart?.inlineData) {
        // Extract any text the model returned (often explains why it refused)
        const textParts = candidate.content.parts
          .filter((part: any) => typeof part.text === "string")
          .map((part: any) => part.text)
          .join("\n")
        const finishReason = candidate.finishReason
        console.error("Gemini returned no image. finishReason:", finishReason, "text:", textParts, "parts:", JSON.stringify(candidate.content.parts.map((p: any) => ({ hasText: !!p.text, hasInlineData: !!p.inlineData, mimeType: p.inlineData?.mimeType }))))
        throw new Error(textParts
          ? `Image generation refused: ${textParts.slice(0, 200)}`
          : `No image in Gemini response (finishReason: ${finishReason || "unknown"})`)
      }

      // Extract suggested name from text part (if present)
      const textPart = candidate.content.parts.find((part: any) => typeof part.text === "string")
      let suggestedName: string | undefined
      if (textPart?.text) {
        const match = textPart.text.match(/NAME:\s*(.+)/i)
        if (match?.[1]) {
          suggestedName = match[1].trim()
        }
      }

      // Log success details
      console.log("[Gemini response]", JSON.stringify({
        finishReason: candidate.finishReason,
        partsCount: candidate.content.parts.length,
        outputImageMime: imagePart.inlineData.mimeType,
        outputImageSize: imagePart.inlineData.data?.length,
        textResponse: textPart?.text?.slice(0, 200),
        suggestedName,
      }))

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
        ...(suggestedName ? { suggestedName } : {}),
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

    // Detect Gemini SDK errors and forward proper status + clean message
    const geminiStatus = error.status ?? error.code
    if (typeof geminiStatus === "number" && geminiStatus >= 400) {
      const cleanMessages: Record<number, string> = {
        429: "Too many requests. Please wait a moment and try again.",
        503: "The AI model is temporarily unavailable due to high demand. Please try again shortly.",
        500: "The AI model encountered an internal error. Please try again.",
        504: "The AI model timed out. Please try again.",
      }
      return NextResponse.json(
        { error: cleanMessages[geminiStatus] || `AI model error (${geminiStatus}). Please try again.`, retryable: geminiStatus === 429 || geminiStatus === 503 },
        { status: geminiStatus }
      )
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ status: "Generate API is running" })
}
