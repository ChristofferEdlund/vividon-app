"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface ApiKeyData {
  id: string
  prefix: string
  name: string
  lastUsedAt: string | null
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

interface UserProfile {
  id: string
  email: string
  creditsRemaining: number
  creditsUsedTotal: number
  subscriptionTier: string
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([])
  const [newKeyName, setNewKeyName] = useState("")
  const [newKey, setNewKey] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/beta-access")
        return
      }
      setUser(session.user)
      await loadData(session.user.id)
      setIsLoading(false)
    }
    checkAuth()
  }, [router, supabase.auth])

  const loadData = async (userId: string) => {
    // Load profile
    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (profileData) {
      setProfile({
        id: profileData.id,
        email: profileData.email,
        creditsRemaining: profileData.credits_remaining,
        creditsUsedTotal: profileData.credits_used_total,
        subscriptionTier: profileData.subscription_tier,
      })
    }

    // Load API keys
    const { data: keysData } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (keysData) {
      setApiKeys(keysData.map(k => ({
        id: k.id,
        prefix: k.key_prefix,
        name: k.name,
        lastUsedAt: k.last_used_at,
        expiresAt: k.expires_at,
        isActive: k.is_active,
        createdAt: k.created_at,
      })))
    }
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })

      if (!response.ok) {
        throw new Error("Failed to create API key")
      }

      const data = await response.json()
      setNewKey(data.key)
      setNewKeyName("")

      // Reload keys
      if (user) {
        await loadData(user.id)
      }

      toast({
        title: "API Key Created",
        description: "Make sure to copy your key now - you won't be able to see it again!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/keys/${keyId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to revoke API key")
      }

      // Reload keys
      if (user) {
        await loadData(user.id)
      }

      toast({
        title: "API Key Revoked",
        description: "The API key has been revoked and can no longer be used.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive",
      })
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "API key copied to clipboard",
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/Vividon_wordsymbol_neg.svg"
              alt="Vividon"
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-400">{user?.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-neutral-400 hover:text-white"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Credits Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-medium text-white mb-4">Your Credits</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-[#10B981]">
                  {profile?.creditsRemaining ?? 0}
                </span>
                <span className="text-neutral-400">credits remaining</span>
              </div>
              <p className="text-sm text-neutral-500 mt-2">
                Total used: {profile?.creditsUsedTotal ?? 0} credits
              </p>
            </div>
            <Button
              asChild
              className="bg-[#10B981] hover:bg-[#059669] text-black"
            >
              <Link href="/pricing">Buy Credits</Link>
            </Button>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <p className="text-sm text-neutral-400">
              Plan: <span className="text-white capitalize">{profile?.subscriptionTier ?? "free"}</span>
            </p>
          </div>
        </div>

        {/* API Keys Section */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <h2 className="text-lg font-medium text-white mb-4">API Keys</h2>
          <p className="text-sm text-neutral-400 mb-6">
            Use these keys to authenticate the Photoshop plugin. Keep them secret!
          </p>

          {/* New Key Display */}
          {newKey && (
            <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-[#10B981] font-medium mb-2">
                Your new API key (copy it now - you won&apos;t see it again):
              </p>
              <div className="flex gap-2">
                <code className="flex-1 bg-black/50 rounded px-3 py-2 text-sm text-white font-mono break-all">
                  {newKey}
                </code>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(newKey)}
                  className="bg-[#10B981] hover:bg-[#059669]"
                >
                  Copy
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNewKey(null)}
                className="mt-2 text-neutral-400"
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Create New Key */}
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Key name (e.g., MacBook Pro)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 bg-neutral-800 border-neutral-700 text-white"
            />
            <Button
              onClick={handleCreateKey}
              disabled={isCreating}
              className="bg-[#3B82F6] hover:bg-[#2563EB]"
            >
              {isCreating ? "Creating..." : "Create Key"}
            </Button>
          </div>

          {/* Existing Keys */}
          <div className="space-y-3">
            {apiKeys.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-4">
                No API keys yet. Create one to use with the Photoshop plugin.
              </p>
            ) : (
              apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    key.isActive
                      ? "bg-neutral-800/50 border-neutral-700"
                      : "bg-neutral-900/50 border-neutral-800 opacity-50"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{key.name}</span>
                      {!key.isActive && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                          Revoked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <code className="text-xs text-neutral-400 font-mono">
                        {key.prefix}...
                      </code>
                      <span className="text-xs text-neutral-500">
                        Created {new Date(key.createdAt).toLocaleDateString()}
                      </span>
                      {key.lastUsedAt && (
                        <span className="text-xs text-neutral-500">
                          Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {key.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeKey(key.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Plugin Instructions */}
        <div className="mt-8 bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <h2 className="text-lg font-medium text-white mb-4">Setup Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-neutral-400 text-sm">
            <li>Download the Vividon plugin for Photoshop</li>
            <li>Open Photoshop and go to Plugins → Vividon</li>
            <li>Paste your API key in the settings panel</li>
            <li>Start relighting your images!</li>
          </ol>
          <div className="mt-4">
            <Button
              variant="outline"
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              asChild
            >
              <Link href="/about">View Tutorial</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
