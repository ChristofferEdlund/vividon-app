"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/admin"
  const code = searchParams.get("code")

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          router.push(next)
          return
        }
      }

      // Fallback: check if session was established via hash fragment
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push(next)
        return
      }

      router.push("/auth?error=auth-callback-failed")
    }

    handleCallback()
  }, [router, next, code])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Completing sign in...</p>
    </div>
  )
}
