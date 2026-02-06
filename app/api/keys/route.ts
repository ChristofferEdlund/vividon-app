import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createApiKey, listApiKeys } from "@/lib/api-keys"

export const dynamic = "force-dynamic"

// GET /api/keys - List all API keys for the current user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const keys = await listApiKeys(user.id)
    return NextResponse.json({ keys })
  } catch (error: any) {
    console.error("List API keys error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, expiresAt } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    const expiration = expiresAt ? new Date(expiresAt) : undefined
    const newKey = await createApiKey(user.id, name.trim(), expiration)

    return NextResponse.json(newKey)
  } catch (error: any) {
    console.error("Create API key error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
