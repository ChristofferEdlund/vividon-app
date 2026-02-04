import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { acceptInvite } from "@/lib/invites"

// POST /api/invite/claim - Claim an invite (authenticated)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: "Invite code required" },
        { status: 400 }
      )
    }

    const result = await acceptInvite(code, user.id, user.email)

    return NextResponse.json({
      success: true,
      creditsGranted: result.creditsGranted,
    })
  } catch (error: unknown) {
    console.error("Claim invite error:", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
