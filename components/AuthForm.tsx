"use client"

import { Auth } from "@supabase/auth-ui-react"
import { ThemeSupa } from "@supabase/auth-ui-shared"
import { createClient } from "@/lib/supabase/client"

interface AuthFormProps {
  redirectTo?: string
  view?: "sign_in" | "sign_up" | "magic_link" | "forgotten_password"
}

export default function AuthForm({
  redirectTo = "/dashboard",
  view = "sign_up"
}: AuthFormProps) {
  const supabase = createClient()

  return (
    <Auth
      supabaseClient={supabase}
      appearance={{
        theme: ThemeSupa,
        variables: {
          default: {
            colors: {
              brand: "#10B981",
              brandAccent: "#059669",
              brandButtonText: "white",
              defaultButtonBackground: "#1f1f1f",
              defaultButtonBackgroundHover: "#2a2a2a",
              defaultButtonBorder: "#333",
              defaultButtonText: "white",
              dividerBackground: "#333",
              inputBackground: "#1a1a1a",
              inputBorder: "#333",
              inputBorderHover: "#444",
              inputBorderFocus: "#10B981",
              inputText: "white",
              inputLabelText: "#999",
              inputPlaceholder: "#666",
              messageText: "#999",
              messageTextDanger: "#ef4444",
              anchorTextColor: "#3B82F6",
              anchorTextHoverColor: "#60a5fa",
            },
            space: {
              spaceSmall: "4px",
              spaceMedium: "8px",
              spaceLarge: "16px",
              labelBottomMargin: "8px",
              anchorBottomMargin: "4px",
              emailInputSpacing: "4px",
              socialAuthSpacing: "8px",
              buttonPadding: "12px 16px",
              inputPadding: "12px 16px",
            },
            borderWidths: {
              buttonBorderWidth: "1px",
              inputBorderWidth: "1px",
            },
            radii: {
              borderRadiusButton: "8px",
              buttonBorderRadius: "8px",
              inputBorderRadius: "8px",
            },
            fonts: {
              bodyFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
              buttonFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
              inputFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
              labelFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
            },
          },
        },
        className: {
          container: "auth-container",
          button: "auth-button",
          input: "auth-input",
        },
      }}
      theme="dark"
      providers={["google"]}
      redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}${redirectTo}`}
      view={view}
      showLinks={true}
      localization={{
        variables: {
          sign_up: {
            email_label: "Email",
            password_label: "Password",
            button_label: "Create Account",
            loading_button_label: "Creating account...",
            social_provider_text: "Sign up with {{provider}}",
            link_text: "Don't have an account? Sign up",
            confirmation_text: "Check your email for the confirmation link",
          },
          sign_in: {
            email_label: "Email",
            password_label: "Password",
            button_label: "Sign In",
            loading_button_label: "Signing in...",
            social_provider_text: "Sign in with {{provider}}",
            link_text: "Already have an account? Sign in",
          },
        },
      }}
    />
  )
}
