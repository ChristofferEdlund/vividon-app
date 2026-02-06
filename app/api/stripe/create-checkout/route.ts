import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripe, CREDIT_PACKAGES } from "@/lib/stripe"
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
    const { packageId, successUrl, cancelUrl } = body

    if (!packageId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Missing required fields: packageId, successUrl, cancelUrl" },
        { status: 400 }
      )
    }

    // Find the credit package
    const creditPackage = CREDIT_PACKAGES.find((p) => p.id === packageId)
    if (!creditPackage) {
      return NextResponse.json({ error: "Invalid package ID" }, { status: 400 })
    }

    if (!creditPackage.priceId) {
      return NextResponse.json(
        { error: "Stripe not configured for this package" },
        { status: 503 }
      )
    }

    // Get or create user profile
    let profiles = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, user.id))

    let profile = profiles[0]

    if (!profile) {
      const newProfiles = await db
        .insert(userProfiles)
        .values({
          id: user.id,
          email: user.email || "",
        })
        .returning()
      profile = newProfiles[0]
    }

    const stripe = getStripe()

    // Get or create Stripe customer
    let customerId = profile.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabaseUserId: user.id,
        },
      })

      customerId = customer.id

      await db
        .update(userProfiles)
        .set({ stripeCustomerId: customerId })
        .where(eq(userProfiles.id, user.id))
    }

    // Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: creditPackage.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        packageId: creditPackage.id,
        credits: creditPackage.credits.toString(),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("Create checkout error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
