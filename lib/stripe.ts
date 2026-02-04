import Stripe from "stripe"

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }
    stripeInstance = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    })
  }
  return stripeInstance
}

// Credit packages available for purchase
export const CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 50,
    price: 5,
    pricePerCredit: 0.10,
    priceId: process.env.STRIPE_PRICE_STARTER || "",
    popular: false,
    description: "Perfect for trying out Vividon",
  },
  {
    id: "creator",
    name: "Creator Pack",
    credits: 200,
    price: 15,
    pricePerCredit: 0.075,
    priceId: process.env.STRIPE_PRICE_CREATOR || "",
    popular: true,
    description: "Best value for regular users",
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 500,
    price: 30,
    pricePerCredit: 0.06,
    priceId: process.env.STRIPE_PRICE_PRO || "",
    popular: false,
    description: "For power users and studios",
  },
] as const

// Map price IDs to credit amounts for webhook processing
export function getCreditsForPriceId(priceId: string): number | null {
  const pkg = CREDIT_PACKAGES.find((p) => p.priceId === priceId)
  return pkg?.credits ?? null
}

// Get or create a Stripe customer for a user
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  existingCustomerId?: string | null
): Promise<string> {
  const stripe = getStripe()

  // If customer already exists, return their ID
  if (existingCustomerId) {
    return existingCustomerId
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  })

  return customer.id
}

// Create a checkout session for credit purchase
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()

  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      priceId,
    },
  })
}

// Create a customer portal session
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe()

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

// Verify webhook signature
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe()

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}
