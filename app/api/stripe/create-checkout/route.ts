import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe, STRIPE_PRODUCTS } from "@/lib/stripe"
import { db, userProfiles } from "@/lib/db"
import { eq } from "drizzle-orm"

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
    const { priceType, successUrl, cancelUrl } = body

    if (!priceType || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const priceId = STRIPE_PRODUCTS[priceType as keyof typeof STRIPE_PRODUCTS]
    if (!priceId) {
      return NextResponse.json({ error: "Invalid price type" }, { status: 400 })
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

    // Determine if subscription or one-time
    const isSubscription = priceType.includes("monthly") || priceType.includes("yearly")

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: isSubscription ? "subscription" : "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        priceType,
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
