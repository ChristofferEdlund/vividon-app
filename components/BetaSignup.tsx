"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { z } from "zod"

const emailSchema = z.string()
  .trim()
  .email({ message: "Please enter a valid email address" })
  .max(255, { message: "Email must be less than 255 characters" })

const BetaSignup = () => {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = emailSchema.safeParse(email)
    if (!result.success) {
      toast({
        title: "Invalid email",
        description: result.error.errors[0].message,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    const { error } = await supabase
      .from("waitlist")
      .insert({ email: result.data.toLowerCase() })

    if (error) {
      setIsLoading(false)
      if (error.code === "23505") {
        toast({
          title: "Already signed up",
          description: "This email is already on our waitlist.",
        })
      } else {
        toast({
          title: "Something went wrong",
          description: "Please try again later.",
          variant: "destructive",
        })
      }
      return
    }

    setIsSubmitted(true)
    setIsLoading(false)

    toast({
      title: "Thanks for your interest!",
      description: "We'll reach out when Beta is ready.",
    })
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center shadow-glow">
          <Check className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-display font-bold text-foreground">
            You&apos;re on the list!
          </h3>
          <p className="text-muted-foreground max-w-sm">
            We&apos;ll contact you as soon as Beta is ready to launch.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto">
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 h-12 bg-neutral-800/80 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-primary focus:ring-0 rounded-md"
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 px-8 bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold transition-colors rounded-md"
        >
          {isLoading ? "Submitting..." : "Join the waitlist"}
        </Button>
      </div>
      <p className="text-sm text-neutral-500 text-center">
        We respect your privacy. No spam, just beta updates.
        <br />
        <span className="text-[11px] leading-snug tracking-tight text-neutral-600 mt-1 inline-block">
          By submitting your email, you agree that Vividon may store and use it
          to send you beta updates and related product information, and you can
          unsubscribe or request deletion at any time.
        </span>
      </p>
    </form>
  )
}

export default BetaSignup
