"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/admin"

  useEffect(() => {
    const supabase = createClient()

    // Handle the OAuth callback - the browser client will automatically
    // pick up the session from the URL hash or exchange the code
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push(next)
      }
    })
  }, [router, next])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Completing sign in...</p>
    </div>
  )
}
