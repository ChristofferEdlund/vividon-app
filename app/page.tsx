"use client"

import Link from "next/link"
import VideoBackground from "@/components/VideoBackground"

// Inline SVG icons to avoid lucide-react serialization issues
function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  )
}

function LinkedinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect width="4" height="12" x="2" y="9"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      <VideoBackground />
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-32">
        {/* Logo */}
        <div className="animate-fade-in mb-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/Vividon_wordsymbol_neg.svg"
            alt="Vividon"
            className="h-12 md:h-14 w-auto mx-auto mb-4"
          />
          <p className="text-xs md:text-sm text-neutral-400 tracking-[0.35em] uppercase text-center">
            Lighting Reinvented
          </p>
        </div>

        {/* Hero Content */}
        <div
          className="text-center mb-10 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white leading-tight mb-8">
            Beta is live
          </h1>

          <p className="text-base md:text-lg text-neutral-400 mb-1">
            Relight images inside Photoshop without prompts.
          </p>
          <p className="text-base md:text-lg text-neutral-400">
            Curated Lights appear as editable layers.
          </p>
        </div>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <Link
            href="/signup"
            className="px-8 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium rounded-lg transition-colors"
          >
            Sign up for Beta
          </Link>
          <Link
            href="/beta-access"
            className="px-8 py-3 bg-[#10B981] hover:bg-[#059669] text-white font-medium rounded-lg transition-colors"
          >
            Access Beta
          </Link>
        </div>

        {/* View Tutorial Link */}
        <div className="mt-10 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 text-xs text-neutral-500 tracking-[0.2em] uppercase hover:text-neutral-300 transition-colors"
          >
            View Tutorial
            <span>→</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="absolute bottom-0 left-0 right-0 pb-6 text-center animate-fade-in z-20"
        style={{ animationDelay: "0.4s" }}
      >
        <div className="mb-4 flex items-center justify-center gap-4">
          <Link
            href="/about"
            className="inline-flex items-center px-5 py-2.5 text-xs text-neutral-500 bg-neutral-900/80 border border-neutral-800 rounded hover:border-neutral-600 hover:text-neutral-300 transition-colors"
          >
            About Vividon
          </Link>
          <a
            href="mailto:info@vividonlab.com"
            className="inline-flex items-center px-5 py-2.5 text-xs text-neutral-500 bg-neutral-900/80 border border-neutral-800 rounded hover:border-neutral-600 hover:text-neutral-300 transition-colors"
          >
            Press inquiries & investors
          </a>
        </div>
        <div className="mb-4 flex items-center justify-center gap-4">
          <a
            href="https://www.instagram.com/vividonlab/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors"
            aria-label="Follow Vividon on Instagram"
          >
            <InstagramIcon />
          </a>
          <a
            href="https://www.linkedin.com/company/vividonlab/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors"
            aria-label="Follow Vividon on LinkedIn"
          >
            <LinkedinIcon />
          </a>
        </div>
        <p className="text-xs text-neutral-600">
          © 2025 Vividon. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
