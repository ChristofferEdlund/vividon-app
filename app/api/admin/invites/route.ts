import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { userProfiles, invites } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { createInvite, listInvites, markInviteSent } from "@/lib/invites"

const ADMIN_EMAILS = [process.env.ADMIN_EMAIL].filter(Boolean)

async function isAdmin(
  request: NextRequest
): Promise<{ isAdmin: boolean; userId?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { isAdmin: false }
  }

  // Check if email is in admin list
  if (user.email && ADMIN_EMAILS.includes(user.email)) {
    return { isAdmin: true, userId: user.id }
  }

  // Check if user has isAdmin flag in database
  const profiles = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1)

  if (profiles[0]?.isAdmin) {
    return { isAdmin: true, userId: user.id }
  }

  return { isAdmin: false }
}

// GET /api/admin/invites - List all invites
export async function GET(request: NextRequest) {
  const { isAdmin: authorized } = await isAdmin(request)

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const allInvites = await listInvites()
    return NextResponse.json({ invites: allInvites })
  } catch (error: unknown) {
    console.error("List invites error:", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/admin/invites - Create a new invite
export async function POST(request: NextRequest) {
  const { isAdmin: authorized, userId } = await isAdmin(request)

  if (!authorized || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { email, creditsToGrant = 10, expiresInDays, sendEmail = false } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Check if there's already a pending invite for this email
    const existingInvites = await db
      .select()
      .from(invites)
      .where(eq(invites.email, email.toLowerCase().trim()))
      .limit(1)

    const pendingInvite = existingInvites.find((i) => !i.used)
    if (pendingInvite) {
      return NextResponse.json(
        { error: "An invite for this email already exists" },
        { status: 400 }
      )
    }

    // Create the invite
    const invite = await createInvite(
      email,
      creditsToGrant,
      userId,
      expiresInDays
    )

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vividon.ai"
    const inviteUrl = `${appUrl}/invite/${invite.code}`

    // Optionally send email via Resend
    if (sendEmail && process.env.RESEND_API_KEY) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || "Vividon <noreply@vividon.ai>",
            to: email,
            subject: "You're invited to Vividon Beta!",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #10B981;">Welcome to Vividon!</h1>
                <p>You've been invited to try Vividon, the AI-powered lighting tool for Photoshop.</p>
                <p>Click the button below to claim your <strong>${creditsToGrant} free credits</strong>:</p>
                <p style="margin: 24px 0;">
                  <a href="${inviteUrl}" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                    Claim Your Credits
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">Or use this link: <a href="${inviteUrl}">${inviteUrl}</a></p>
                <p style="color: #666; font-size: 14px;">Invite code: <strong>${invite.code}</strong></p>
                ${invite.expiresAt ? `<p style="color: #666; font-size: 14px;">This invite expires on ${new Date(invite.expiresAt).toLocaleDateString()}.</p>` : ""}
                <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;" />
                <p style="color: #999; font-size: 12px;">Happy creating!<br/>The Vividon Team</p>
              </div>
            `,
          }),
        })

        if (response.ok) {
          await markInviteSent(invite.id)
        } else {
          console.error("Failed to send invite email:", await response.text())
        }
      } catch (emailError) {
        console.error("Email sending error:", emailError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      invite,
      inviteUrl,
    })
  } catch (error: unknown) {
    console.error("Create invite error:", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
