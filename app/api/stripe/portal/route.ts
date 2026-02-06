import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"
import { db } from "@/lib/db"
import { userProfiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { returnUrl } = body

    if (!returnUrl) {
      return NextResponse.json(
        { error: "Missing required field: returnUrl" },
        { status: 400 }
      )
    }

    // Get user profile
    const profiles = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, user.id))

    const profile = profiles[0]

    if (!profile?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Make a purchase first." },
        { status: 400 }
      )
    }

    const stripe = getStripe()

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("Create portal session error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
