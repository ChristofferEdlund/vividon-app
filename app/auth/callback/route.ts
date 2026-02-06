import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  let next = searchParams.get("next") ?? "/admin"

  if (!next.startsWith("/")) next = "/"

  const forwardedHost = request.headers.get("x-forwarded-host")
  const isLocalEnv = process.env.NODE_ENV === "development"

  function getRedirectUrl(path: string) {
    if (isLocalEnv) return `${origin}${path}`
    if (forwardedHost) return `https://${forwardedHost}${path}`
    return `${origin}${path}`
  }

  if (!code) {
    return NextResponse.redirect(getRedirectUrl(`/auth?error=no-code`))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      getRedirectUrl(`/auth?error=${encodeURIComponent(error.message)}`)
    )
  }

  return NextResponse.redirect(getRedirectUrl(next))
}
