import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe, CREDIT_AMOUNTS, SUBSCRIPTION_CREDITS } from "@/lib/stripe"
import { db, userProfiles, creditTransactions } from "@/lib/db"
import { eq } from "drizzle-orm"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Webhook handler error:", error)
    return NextResponse.json(
      { error: error.message || "Webhook handler failed" },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const priceType = session.metadata?.priceType

  if (!userId || !priceType) {
    console.error("Missing metadata in checkout session")
    return
  }

  // One-time credit purchase
  if (priceType.startsWith("credits_")) {
    const creditAmount = CREDIT_AMOUNTS[priceType]
    if (!creditAmount) return

    const profiles = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))

    const profile = profiles[0]
    if (!profile) return

    // Add credits
    await db
      .update(userProfiles)
      .set({
        creditsRemaining: profile.creditsRemaining + creditAmount,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId))

    // Record transaction
    await db.insert(creditTransactions).values({
      userId,
      amount: creditAmount,
      type: "purchase",
      stripePaymentId: session.payment_intent as string,
      description: `Purchased ${creditAmount} credits`,
    })
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Handle subscription renewal
  if (!invoice.subscription || !invoice.customer) return

  // Get user by Stripe customer ID
  const profiles = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.stripeCustomerId, invoice.customer as string))

  const profile = profiles[0]
  if (!profile) return

  // Add subscription credits
  const creditAmount = SUBSCRIPTION_CREDITS[profile.subscriptionTier] || 0
  if (creditAmount === 0) return

  await db
    .update(userProfiles)
    .set({
      creditsRemaining: profile.creditsRemaining + creditAmount,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.id, profile.id))

  await db.insert(creditTransactions).values({
    userId: profile.id,
    amount: creditAmount,
    type: "subscription_refresh",
    stripeInvoiceId: invoice.id,
    description: `Monthly ${profile.subscriptionTier} subscription credits`,
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const profiles = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.stripeCustomerId, customerId))

  const profile = profiles[0]
  if (!profile) return

  // Determine tier from price
  const priceId = subscription.items.data[0]?.price.id
  let tier: "free" | "pro" | "enterprise" = "free"

  if (priceId?.includes("pro")) {
    tier = "pro"
  } else if (priceId?.includes("enterprise")) {
    tier = "enterprise"
  }

  await db
    .update(userProfiles)
    .set({
      subscriptionTier: tier,
      stripeSubscriptionId: subscription.id,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.id, profile.id))
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const profiles = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.stripeCustomerId, customerId))

  const profile = profiles[0]
  if (!profile) return

  await db
    .update(userProfiles)
    .set({
      subscriptionTier: "free",
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.id, profile.id))
}
