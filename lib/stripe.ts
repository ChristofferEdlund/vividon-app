import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
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
