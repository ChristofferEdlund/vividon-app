import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import BetaSignup from "@/components/BetaSignup"

export const dynamic = "force-dynamic"

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="w-full max-w-lg text-center">
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/Vividon_wordsymbol_neg.svg"
            alt="Vividon"
            className="h-10 w-auto mx-auto mb-8"
          />

          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-light text-white mb-4">
            Sign up for Beta
          </h1>
          <p className="text-neutral-400 mb-10">
            Join the waitlist to be one of the first to try Vividon.
          </p>

          {/* Signup Form */}
          <BetaSignup />
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-xs text-neutral-600">
          © 2025 Vividon. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
