"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import VideoBackground from "@/components/VideoBackground"
import AuthForm from "@/components/AuthForm"
import { createClient } from "@/lib/supabase/client"

export default function BetaAccessPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push("/dashboard")
      }
    }
    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/dashboard")
      }
    })

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <VideoBackground />
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="animate-fade-in mb-8">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/Vividon_wordsymbol_neg.svg"
              alt="Vividon"
              className="h-10 md:h-12 w-auto mx-auto mb-4"
            />
          </Link>
          <p className="text-xs md:text-sm text-neutral-400 tracking-[0.35em] uppercase text-center">
            Lighting Reinvented
          </p>
        </div>

        {/* Auth Form */}
        <div
          className="w-full max-w-sm animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <h1 className="text-2xl md:text-3xl font-light text-white text-center mb-2">
            Access Beta
          </h1>
          <p className="text-sm text-neutral-400 text-center mb-6">
            Sign up to get 10 free credits
          </p>

          <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-6">
            <AuthForm redirectTo="/dashboard" view="sign_up" />
          </div>

          <p className="text-xs text-neutral-500 text-center mt-6">
            Just want to stay updated?{" "}
            <Link href="/signup" className="text-[#3B82F6] hover:underline">
              Join the waitlist
            </Link>
          </p>
        </div>

        {/* Back Link */}
        <div className="mt-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-neutral-500 tracking-[0.2em] uppercase hover:text-neutral-300 transition-colors"
          >
            <span>←</span>
            Back
          </Link>
        </div>
      </main>
    </div>
  )
}
