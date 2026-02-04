"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

// Credit packages - must match lib/stripe.ts
const CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 50,
    price: 5,
    pricePerCredit: 0.10,
    popular: false,
    description: "Perfect for trying out Vividon",
  },
  {
    id: "creator",
    name: "Creator Pack",
    credits: 200,
    price: 15,
    pricePerCredit: 0.075,
    popular: true,
    description: "Best value for regular users",
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 500,
    price: 30,
    pricePerCredit: 0.06,
    popular: false,
    description: "For power users and studios",
  },
]

export default function PricingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null)

  const handlePurchase = async (packageId: string) => {
    setLoadingPackage(packageId)

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          successUrl: `${window.location.origin}/dashboard?purchase=success`,
          cancelUrl: `${window.location.origin}/pricing?purchase=cancelled`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          // Not logged in, redirect to login
          router.push("/beta-access?redirect=/pricing")
          return
        }
        throw new Error(data.error || "Failed to create checkout session")
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoadingPackage(null)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/Vividon_wordsymbol_neg.svg"
              alt="Vividon"
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-neutral-400 hover:text-white"
            >
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Buy Credits
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Credits are used for AI-powered relighting. Choose the pack that fits your needs.
          </p>
        </div>

        {/* Credit cost info */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 mb-12 max-w-2xl mx-auto">
          <h3 className="text-white font-medium mb-2">Credit Costs</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-neutral-400">Fast (Flash):</span>
              <span className="text-white ml-2">1 credit</span>
            </div>
            <div>
              <span className="text-neutral-400">Balanced:</span>
              <span className="text-white ml-2">5 credits</span>
            </div>
            <div>
              <span className="text-neutral-400">Quality (4K):</span>
              <span className="text-white ml-2">15 credits</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative bg-neutral-900 border rounded-xl p-6 ${
                pkg.popular
                  ? "border-[#10B981] ring-1 ring-[#10B981]/20"
                  : "border-neutral-800"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#10B981] text-black text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-1">
                  {pkg.name}
                </h3>
                <p className="text-neutral-400 text-sm">{pkg.description}</p>
              </div>

              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-white">
                    ${pkg.price}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-semibold text-[#10B981]">
                    {pkg.credits}
                  </span>
                  <span className="text-neutral-400 ml-1">credits</span>
                </div>
                <p className="text-neutral-500 text-sm mt-1">
                  ${pkg.pricePerCredit.toFixed(2)} per credit
                </p>
              </div>

              <Button
                onClick={() => handlePurchase(pkg.id)}
                disabled={loadingPackage !== null}
                className={`w-full ${
                  pkg.popular
                    ? "bg-[#10B981] hover:bg-[#059669] text-black"
                    : "bg-neutral-800 hover:bg-neutral-700 text-white"
                }`}
              >
                {loadingPackage === pkg.id ? "Loading..." : "Buy Now"}
              </Button>
            </div>
          ))}
        </div>

        {/* FAQ or additional info */}
        <div className="mt-16 text-center">
          <p className="text-neutral-500 text-sm">
            Credits never expire. Need more?{" "}
            <a href="mailto:hello@vividon.ai" className="text-[#3B82F6] hover:underline">
              Contact us for enterprise pricing.
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
