import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db, userProfiles, generations, creditTransactions } from "@/lib/db"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const profiles = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, user.id))

    const profile = profiles[0]

    if (!profile) {
      return NextResponse.json({
        creditsRemaining: 0,
        creditsUsedTotal: 0,
        subscriptionTier: "free",
        recentGenerations: [],
      })
    }

    // Get recent generations
    const recentGenerations = await db
      .select()
      .from(generations)
      .where(eq(generations.userId, user.id))
      .orderBy(desc(generations.createdAt))
      .limit(10)

    // Get recent transactions
    const recentTransactions = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, user.id))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(10)

    return NextResponse.json({
      creditsRemaining: profile.creditsRemaining,
      creditsUsedTotal: profile.creditsUsedTotal,
      subscriptionTier: profile.subscriptionTier,
      stripeCustomerId: profile.stripeCustomerId,
      recentGenerations: recentGenerations.map((g) => ({
        id: g.id,
        status: g.status,
        qualityTier: g.qualityTier,
        creditsCost: g.creditsCost,
        createdAt: g.createdAt,
      })),
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt,
      })),
    })
  } catch (error: any) {
    console.error("Usage API error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
