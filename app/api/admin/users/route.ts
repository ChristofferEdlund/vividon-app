import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { userProfiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

// Admin emails that can access this endpoint
const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL,
  // Add more admin emails here or use is_admin field
].filter(Boolean)

async function isAdmin(request: NextRequest): Promise<{ isAdmin: boolean; userId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { isAdmin: false }
  }

  // Check if user is admin by email or is_admin flag
  if (ADMIN_EMAILS.includes(user.email)) {
    return { isAdmin: true, userId: user.id }
  }

  // Check is_admin flag in database
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

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  const { isAdmin: authorized } = await isAdmin(request)

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const users = await db
      .select({
        id: userProfiles.id,
        email: userProfiles.email,
        creditsRemaining: userProfiles.creditsRemaining,
        creditsUsedTotal: userProfiles.creditsUsedTotal,
        subscriptionTier: userProfiles.subscriptionTier,
        isApproved: userProfiles.isApproved,
        isBlocked: userProfiles.isBlocked,
        isAdmin: userProfiles.isAdmin,
        createdAt: userProfiles.createdAt,
        updatedAt: userProfiles.updatedAt,
      })
      .from(userProfiles)
      .orderBy(userProfiles.createdAt)

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error("Admin users list error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/users - Update a user
export async function PATCH(request: NextRequest) {
  const { isAdmin: authorized } = await isAdmin(request)

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { userId, updates } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Whitelist allowed fields
    const allowedFields = ["creditsRemaining", "isApproved", "isBlocked", "isAdmin"]
    const sanitizedUpdates: Record<string, any> = {}

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field]
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 })
    }

    sanitizedUpdates.updatedAt = new Date()

    const [updated] = await db
      .update(userProfiles)
      .set(sanitizedUpdates)
      .where(eq(userProfiles.id, userId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: updated })
  } catch (error: any) {
    console.error("Admin users update error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
