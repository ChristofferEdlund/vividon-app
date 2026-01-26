"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function AboutPage() {
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
      <main className="flex-1 flex flex-col items-center px-6 pb-20 pt-10">
        <div className="w-full max-w-2xl">
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/Vividon_wordsymbol_neg.svg"
            alt="Vividon"
            className="h-10 w-auto mx-auto mb-12"
          />

          {/* Content */}
          <div className="space-y-8 text-neutral-300">
            <section>
              <h1 className="text-3xl md:text-4xl font-light text-white mb-6">
                About Vividon
              </h1>
              <p className="text-lg leading-relaxed">
                Vividon is an AI-powered Photoshop plugin that lets you relight
                images without complex prompts. Simply select a lighting preset
                and watch as your images transform with professional-quality
                lighting adjustments.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-white mb-4">
                How It Works
              </h2>
              <ol className="space-y-3 text-neutral-400">
                <li className="flex gap-3">
                  <span className="text-[#10B981] font-medium">1.</span>
                  <span>
                    Open the Vividon panel in Photoshop (Plugins → Vividon)
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#10B981] font-medium">2.</span>
                  <span>Select a layer or work on the entire document</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#10B981] font-medium">3.</span>
                  <span>Choose a lighting preset from our curated library</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#10B981] font-medium">4.</span>
                  <span>
                    Click Apply and get your relit image as a new layer
                  </span>
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-medium text-white mb-4">
                Requirements
              </h2>
              <ul className="space-y-2 text-neutral-400">
                <li>• Adobe Photoshop 2023 (v24.2) or later</li>
                <li>• Windows 10/11 or macOS 11+</li>
                <li>• Internet connection for AI processing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium text-white mb-4">Contact</h2>
              <p className="text-neutral-400">
                For press inquiries, partnerships, or support, reach out to us
                at{" "}
                <a
                  href="mailto:info@vividonlab.com"
                  className="text-[#3B82F6] hover:underline"
                >
                  info@vividonlab.com
                </a>
              </p>
            </section>
          </div>
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
