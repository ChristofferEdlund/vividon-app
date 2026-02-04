import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { userProfiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revokeInvite } from "@/lib/invites"

const ADMIN_EMAILS = [process.env.ADMIN_EMAIL].filter(Boolean)

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return false

  // Check if email is in admin list
  if (user.email && ADMIN_EMAILS.includes(user.email)) return true

  // Check if user has isAdmin flag in database
  const profiles = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1)

  return profiles[0]?.isAdmin ?? false
}

// DELETE /api/admin/invites/[id] - Revoke an invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await isAdmin()

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const { id } = await params
    const revoked = await revokeInvite(id)

    if (!revoked) {
      return NextResponse.json(
        { error: "Invite not found or already used" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Revoke invite error:", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
