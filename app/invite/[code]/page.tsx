"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import AuthForm from "@/components/AuthForm"
import VideoBackground from "@/components/VideoBackground"

interface InviteInfo {
  email: string
  creditsToGrant: number
  expiresAt: string | null
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const code = params.code as string

  const [status, setStatus] = useState<
    "loading" | "valid" | "invalid" | "claiming" | "success" | "error"
  >("loading")
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creditsGranted, setCreditsGranted] = useState<number>(0)
  const [user, setUser] = useState<{ email?: string } | null>(null)

  const claimInvite = useCallback(async () => {
    setStatus("claiming")

    try {
      const response = await fetch("/api/invite/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()

      if (!response.ok) {
        setStatus("error")
        setError(data.error || "Failed to claim invite")
        return
      }

      setCreditsGranted(data.creditsGranted)
      setStatus("success")
    } catch (err: unknown) {
      setStatus("error")
      const message =
        err instanceof Error ? err.message : "Failed to claim invite"
      setError(message)
    }
  }, [code])

  useEffect(() => {
    // Validate the invite code
    const validateInvite = async () => {
      try {
        const response = await fetch(
          `/api/invite/validate?code=${encodeURIComponent(code)}`
        )
        const data = await response.json()

        if (!response.ok) {
          setStatus("invalid")
          setError(data.error || "Invalid invite code")
          return
        }

        setInvite(data.invite)

        // Check if user is already logged in
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session) {
          setUser(session.user)
          // Auto-claim if email matches
          if (
            session.user.email?.toLowerCase() ===
            data.invite.email.toLowerCase()
          ) {
            claimInvite()
          } else {
            setStatus("valid")
          }
        } else {
          setStatus("valid")
        }
      } catch (err: unknown) {
        setStatus("invalid")
        const message =
          err instanceof Error ? err.message : "Failed to validate invite"
        setError(message)
      }
    }

    validateInvite()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && invite) {
        setUser(session.user)
        if (
          session.user.email?.toLowerCase() === invite.email.toLowerCase()
        ) {
          claimInvite()
        } else {
          setStatus("valid")
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [code, supabase.auth, claimInvite, invite])

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
            You&apos;re Invited!
          </p>
        </div>

        <div className="w-full max-w-sm bg-neutral-900/80 border border-neutral-800 rounded-lg p-6">
          {status === "loading" && (
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-neutral-400">Validating invite...</p>
            </div>
          )}

          {status === "invalid" && (
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
              <h2 className="text-xl font-medium text-white mb-2">
                Invalid Invite
              </h2>
              <p className="text-red-400 mb-4">{error}</p>
              <Link
                href="/beta-access"
                className="inline-block px-4 py-2 border border-neutral-600 rounded-lg text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                Join Waitlist Instead
              </Link>
            </div>
          )}

          {status === "valid" && invite && (
            <>
              <h1 className="text-xl font-medium text-white text-center mb-2">
                Welcome to Vividon!
              </h1>
              <p className="text-sm text-neutral-400 text-center mb-4">
                You&apos;ve been invited with{" "}
                <span className="text-[#10B981] font-medium">
                  {invite.creditsToGrant} free credits
                </span>
              </p>

              {user ? (
                <div className="text-center">
                  <p className="text-neutral-400 mb-4">
                    Signed in as {user.email}
                  </p>
                  {user.email?.toLowerCase() !== invite.email.toLowerCase() && (
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded p-3 mb-4">
                      <p className="text-sm text-yellow-400">
                        This invite was sent to {invite.email}. Please sign in
                        with that email to claim it.
                      </p>
                    </div>
                  )}
                  <button
                    onClick={claimInvite}
                    className="w-full px-4 py-3 bg-[#10B981] hover:bg-[#059669] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      user.email?.toLowerCase() !== invite.email.toLowerCase()
                    }
                  >
                    Claim {invite.creditsToGrant} Credits
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-neutral-500 text-center mb-4">
                    Sign in or create an account with{" "}
                    <span className="text-white">{invite.email}</span> to claim
                    your credits.
                  </p>
                  <AuthForm redirectTo={`/invite/${code}`} view="sign_up" />
                </>
              )}
            </>
          )}

          {status === "claiming" && (
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-neutral-400">Claiming your invite...</p>
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
              <h2 className="text-xl font-medium text-white mb-2">
                Welcome to Vividon!
              </h2>
              <p className="text-[#10B981] text-lg font-medium mb-4">
                {creditsGranted} credits added to your account
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full px-4 py-3 bg-[#10B981] hover:bg-[#059669] text-white font-medium rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
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
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-block px-4 py-2 border border-neutral-600 rounded-lg text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
