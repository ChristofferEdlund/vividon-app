"use client"

import Link from "next/link"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import VideoBackground from "@/components/VideoBackground"

export default function BetaWelcomePage() {
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
        </div>

        {/* Welcome Content */}
        <div
          className="w-full max-w-md text-center animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <h1 className="text-3xl md:text-4xl font-light text-white mb-4">
            Welcome to Beta!
          </h1>
          <p className="text-neutral-400 mb-8">
            You now have access to Vividon. Download the plugin and start
            relighting your images.
          </p>

          <Button
            asChild
            className="h-12 px-8 bg-[#10B981] hover:bg-[#059669] text-white font-medium"
          >
            <a href="/downloads/vividon-plugin.ccx" download>
              <Download className="w-5 h-5 mr-2" />
              Download Plugin
            </a>
          </Button>

          <div className="mt-8 p-4 bg-neutral-900/80 rounded-lg border border-neutral-800">
            <h3 className="text-sm font-medium text-white mb-2">
              Installation Instructions
            </h3>
            <ol className="text-xs text-neutral-400 text-left space-y-1">
              <li>1. Download the .ccx file above</li>
              <li>2. Double-click to install in Photoshop</li>
              <li>3. Restart Photoshop</li>
              <li>4. Find Vividon under Plugins → Vividon</li>
            </ol>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-neutral-500 tracking-[0.2em] uppercase hover:text-neutral-300 transition-colors"
          >
            <span>←</span>
            Back to home
          </Link>
        </div>
      </main>
    </div>
  )
}
