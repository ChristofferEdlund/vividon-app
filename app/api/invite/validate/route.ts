import { NextRequest, NextResponse } from "next/server"
import { getInvitePublicInfo } from "@/lib/invites"

export const dynamic = "force-dynamic"

// GET /api/invite/validate?code=xxx - Validate an invite code (public)
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code")

    if (!code) {
      return NextResponse.json({ error: "Code required" }, { status: 400 })
    }

    const invite = await getInvitePublicInfo(code)

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid or expired invite code" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      invite: {
        email: invite.email,
        creditsToGrant: invite.creditsToGrant,
        expiresAt: invite.expiresAt,
      },
    })
  } catch (error: unknown) {
    console.error("Validate invite error:", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
