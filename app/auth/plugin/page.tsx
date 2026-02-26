"use client"

import { useEffect, useState, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import AuthForm from "@/components/AuthForm"
import VideoBackground from "@/components/VideoBackground"

function PluginAuthContent() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const sessionToken = searchParams.get("session")

  const [status, setStatus] = useState<
    "loading" | "login" | "completing" | "success" | "waitlisted" | "error"
  >("loading")
  const [error, setError] = useState<string | null>(null)
  const completingRef = useCallback(() => {
    let called = false
    return () => { if (called) return false; called = true; return true }
  }, [])()

  const completeSession = useCallback(async () => {
    if (!sessionToken || !completingRef()) return

    try {
      const response = await fetch("/api/auth/plugin-session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        // "Already completed" means the plugin already got the key — treat as success
        if (response.status === 404 || data.error?.includes("already completed")) {
          setStatus("success")
          return
        }
        setStatus("error")
        setError(data.error || "Failed to complete authentication")
        return
      }

      if (data.status === "waitlisted") {
        setStatus("waitlisted")
        return
      }

      setStatus("success")
    } catch (err: unknown) {
      setStatus("error")
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred"
      setError(message)
    }
  }, [sessionToken])

  useEffect(() => {
    if (!sessionToken) {
      setStatus("error")
      setError("Invalid session. Please start the login process from Photoshop again.")
      return
    }

    // Check if user is already logged in
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        setStatus("completing")
        completeSession()
      } else {
        setStatus("login")
      }
    }

    checkAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setStatus("completing")
        completeSession()
      }
    })

    return () => subscription.unsubscribe()
  }, [sessionToken, supabase.auth, completeSession])

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <VideoBackground />
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="animate-fade-in mb-8">
          <Link href="/">
            <img
              src="/assets/Vividon_wordsymbol_neg.svg"
              alt="Vividon"
              className="h-10 md:h-12 w-auto mx-auto mb-4"
            />
          </Link>
          <p className="text-xs md:text-sm text-neutral-400 tracking-[0.35em] uppercase text-center">
            Photoshop Plugin Login
          </p>
        </div>

        <div className="w-full max-w-sm bg-neutral-900/80 border border-neutral-800 rounded-lg p-6">
          {status === "loading" && (
            <div className="text-center">
              <p className="text-neutral-400">Loading...</p>
            </div>
          )}

          {status === "login" && (
            <>
              <h1 className="text-xl font-medium text-white text-center mb-4">
                Sign in to connect Photoshop
              </h1>
              <p className="text-sm text-neutral-400 text-center mb-6">
                Sign in to authorize the Vividon plugin
              </p>
              <AuthForm
                redirectTo={`/auth/plugin?session=${sessionToken}`}
                view="sign_in"
              />
            </>
          )}

          {status === "completing" && (
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-neutral-400">Connecting to Photoshop...</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-[#10B981]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-[#10B981]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-white mb-2">Connected!</h2>
              <p className="text-neutral-400 mb-4">
                You can close this window and return to Photoshop.
              </p>
              <p className="text-sm text-neutral-500">
                The plugin will automatically detect your login.
              </p>
            </div>
          )}

          {status === "waitlisted" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-white mb-2">
                Beta Access Required
              </h2>
              <p className="text-neutral-400 mb-4">
                Vividon is currently in closed beta. Join the waitlist and
                we&apos;ll let you know when you&apos;re in.
              </p>
              <Link
                href="/signup"
                className="inline-block px-6 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium rounded-lg transition-colors mb-4"
              >
                Join the Waitlist
              </Link>
              <p className="text-sm text-neutral-500">
                You can close this window and return to Photoshop.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-white mb-2">Error</h2>
              <p className="text-red-400 mb-4">{error}</p>
              <Link
                href="/dashboard"
                className="inline-block px-4 py-2 border border-neutral-600 rounded-lg text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function PluginAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <p className="text-neutral-400">Loading...</p>
        </div>
      }
    >
      <PluginAuthContent />
    </Suspense>
  )
}
