"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import VideoBackground from "@/components/VideoBackground"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function BetaAccessPage() {
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // TODO: Add backend validation for beta codes later
    // For now, allow access without code validation
    setTimeout(() => {
      setIsLoading(false)
      router.push("/beta-welcome")
    }, 500)
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <VideoBackground />
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="animate-fade-in mb-12">
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

        {/* Access Code Form */}
        <div
          className="w-full max-w-sm animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <h1 className="text-2xl md:text-3xl font-light text-white text-center mb-2">
            Access Beta
          </h1>
          <p className="text-sm text-neutral-400 text-center mb-8">
            Enter your beta access code to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Enter your code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-12 bg-neutral-900/80 border-neutral-700 text-white placeholder:text-neutral-500 text-center text-lg tracking-widest uppercase"
              maxLength={20}
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#10B981] hover:bg-[#059669] text-white font-medium"
            >
              {isLoading ? "Validating..." : "Continue"}
            </Button>
          </form>

          <p className="text-xs text-neutral-500 text-center mt-6">
            Don&apos;t have a code?{" "}
            <Link href="/signup" className="text-[#3B82F6] hover:underline">
              Sign up for Beta
            </Link>
          </p>
        </div>

        {/* Back Link */}
        <div className="mt-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
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
