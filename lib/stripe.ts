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

// For backwards compatibility - lazy proxy
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop]
  },
})

// Product/Price IDs - configure these in Stripe Dashboard
export const STRIPE_PRODUCTS = {
  // Credit packs
  credits_100: process.env.STRIPE_PRICE_CREDITS_100,
  credits_500: process.env.STRIPE_PRICE_CREDITS_500,
  credits_1000: process.env.STRIPE_PRICE_CREDITS_1000,

  // Subscriptions
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
  enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
}

// Credit amounts per product
export const CREDIT_AMOUNTS: Record<string, number> = {
  credits_100: 100,
  credits_500: 500,
  credits_1000: 1000,
}

// Subscription credits per tier (monthly refresh)
export const SUBSCRIPTION_CREDITS: Record<string, number> = {
  pro: 500,
  enterprise: 2000,
}
