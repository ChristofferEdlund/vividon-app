import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"
import { pluginAuthSessions, apiKeys } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

const SESSION_TTL_MINUTES = 10

// POST - Create a new plugin auth session
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP (unauthenticated endpoint)
    const rateLimitResponse = await checkRateLimit(request, RATE_LIMITS.pluginSession)
    if (rateLimitResponse) return rateLimitResponse
    // Generate a secure random session token
    const sessionToken = randomBytes(32).toString("base64url")

    // Calculate expiration (10 minutes from now)
    const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000)

    // Create the session
    const [session] = await db
      .insert(pluginAuthSessions)
      .values({
        sessionToken,
        expiresAt,
        status: "pending",
      })
      .returning()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vividon.ai"

    return NextResponse.json({
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt.toISOString(),
      authUrl: `${appUrl}/auth/plugin?session=${session.sessionToken}`,
    })
  } catch (error: unknown) {
    console.error("Create plugin session error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET - Poll for session completion
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    // Find the session
    const sessions = await db
      .select()
      .from(pluginAuthSessions)
      .where(eq(pluginAuthSessions.sessionToken, token))
      .limit(1)

    if (sessions.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const session = sessions[0]

    // Check if expired
    if (new Date() > session.expiresAt) {
      return NextResponse.json(
        {
          status: "expired",
          error: "Session expired",
        },
        { status: 410 }
      )
    }

    // If pending, return waiting status
    if (session.status === "pending") {
      return NextResponse.json({
        status: "pending",
        expiresAt: session.expiresAt.toISOString(),
      })
    }

    // If completed, return the API key
    if (session.status === "completed" && session.apiKeyPlaintext) {
      // Get API key prefix for display
      let keyPrefix = ""
      if (session.apiKeyId) {
        const keys = await db
          .select({
            prefix: apiKeys.keyPrefix,
            name: apiKeys.name,
          })
          .from(apiKeys)
          .where(eq(apiKeys.id, session.apiKeyId))
          .limit(1)

        if (keys.length > 0) {
          keyPrefix = keys[0].prefix
        }
      }

      // Clear the plaintext key after retrieval (one-time access)
      await db
        .update(pluginAuthSessions)
        .set({ apiKeyPlaintext: null })
        .where(eq(pluginAuthSessions.id, session.id))

      return NextResponse.json({
        status: "completed",
        apiKey: session.apiKeyPlaintext,
        keyPrefix,
      })
    }

    // Completed but key already retrieved
    if (session.status === "completed" && !session.apiKeyPlaintext) {
      return NextResponse.json(
        {
          status: "completed",
          error: "API key already retrieved",
        },
        { status: 410 }
      )
    }

    return NextResponse.json({ status: session.status })
  } catch (error: unknown) {
    console.error("Poll plugin session error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
