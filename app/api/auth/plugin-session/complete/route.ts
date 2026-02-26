import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { pluginAuthSessions, userProfiles } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { createApiKey } from "@/lib/api-keys"

export const dynamic = "force-dynamic"

// POST - Complete a plugin auth session (called from /auth/plugin page after login)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionToken } = await request.json()

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Session token required" },
        { status: 400 }
      )
    }

    // Find the pending session
    const sessions = await db
      .select()
      .from(pluginAuthSessions)
      .where(
        and(
          eq(pluginAuthSessions.sessionToken, sessionToken),
          eq(pluginAuthSessions.status, "pending")
        )
      )
      .limit(1)

    if (sessions.length === 0) {
      return NextResponse.json(
        { error: "Session not found or already completed" },
        { status: 404 }
      )
    }

    const session = sessions[0]

    // Check if expired
    if (new Date() > session.expiresAt) {
      return NextResponse.json({ error: "Session expired" }, { status: 410 })
    }

    // Check if user profile exists and is approved
    const profiles = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, user.id))
      .limit(1)

    if (profiles.length === 0) {
      return NextResponse.json(
        {
          error:
            "User profile not found. Please complete your account setup first.",
        },
        { status: 403 }
      )
    }

    const profile = profiles[0]

    if (profile.isBlocked) {
      return NextResponse.json(
        { error: "Account is blocked. Please contact support." },
        { status: 403 }
      )
    }

    if (!profile.isApproved) {
      // Mark session as waitlisted so the plugin can show a friendly message
      await db
        .update(pluginAuthSessions)
        .set({
          userId: user.id,
          status: "waitlisted",
          completedAt: new Date(),
        })
        .where(eq(pluginAuthSessions.id, session.id))

      return NextResponse.json({
        status: "waitlisted",
        message:
          "You're on the beta waitlist! We'll notify you when your account is activated.",
      })
    }

    // Create a new API key for the plugin
    const newKey = await createApiKey(
      user.id,
      `Photoshop Plugin (${new Date().toLocaleDateString()})`
    )

    // Complete the session with the API key
    await db
      .update(pluginAuthSessions)
      .set({
        userId: user.id,
        apiKeyId: newKey.id,
        apiKeyPlaintext: newKey.key,
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(pluginAuthSessions.id, session.id))

    return NextResponse.json({
      success: true,
      message:
        "Session completed. You can close this window and return to Photoshop.",
    })
  } catch (error: unknown) {
    console.error("Complete plugin session error:", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
