"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Invite {
  id: string
  email: string
  code: string
  creditsToGrant: number
  used: boolean
  usedAt: string | null
  createdAt: string
  expiresAt: string | null
  sentAt: string | null
}

export default function AdminInvitesPage() {
  const router = useRouter()

  const [invites, setInvites] = useState<Invite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newEmail, setNewEmail] = useState("")
  const [newCredits, setNewCredits] = useState("10")
  const [isCreating, setIsCreating] = useState(false)
  const [sendEmail, setSendEmail] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  useEffect(() => {
    loadInvites()
  }, [])

  const loadInvites = async () => {
    try {
      const res = await fetch("/api/admin/invites")
      if (res.status === 403) {
        router.push("/dashboard")
        return
      }
      if (!res.ok) throw new Error("Failed to load invites")
      const data = await res.json()
      setInvites(data.invites)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load invites"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  const createInvite = async () => {
    if (!newEmail.trim()) {
      setMessage({ type: "error", text: "Email is required" })
      return
    }

    setIsCreating(true)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          creditsToGrant: parseInt(newCredits, 10) || 10,
          sendEmail,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create invite")
      }

      const data = await res.json()

      // Copy invite URL to clipboard
      await navigator.clipboard.writeText(data.inviteUrl)

      setMessage({
        type: "success",
        text: sendEmail
          ? "Invite created and email sent! URL copied to clipboard."
          : "Invite created! URL copied to clipboard.",
      })

      setNewEmail("")
      setNewCredits("10")
      setSendEmail(false)
      await loadInvites()
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create invite"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setIsCreating(false)
    }
  }

  const revokeInvite = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/invites/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to revoke invite")

      setMessage({ type: "success", text: "Invite revoked" })
      await loadInvites()
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to revoke invite"
      setMessage({ type: "error", text: errorMessage })
    }
  }

  const copyInviteUrl = async (code: string) => {
    const url = `${window.location.origin}/invite/${code}`
    await navigator.clipboard.writeText(url)
    setMessage({ type: "success", text: "Invite URL copied to clipboard" })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-neutral-400">Loading...</p>
      </div>
    )
  }

  const usedCount = invites.filter((i) => i.used).length
  const pendingCount = invites.filter((i) => !i.used).length

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold">
              Invite Management
            </h1>
          </div>
          <Link
            href="/admin/users"
            className="px-4 py-2 border border-neutral-700 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Users
          </Link>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-500/20 border border-green-500/30 text-green-400"
                : "bg-red-500/20 border border-red-500/30 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="border border-neutral-800 rounded-lg p-4">
            <p className="text-sm text-neutral-500">Total Invites</p>
            <p className="text-2xl font-bold">{invites.length}</p>
          </div>
          <div className="border border-neutral-800 rounded-lg p-4">
            <p className="text-sm text-neutral-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
          </div>
          <div className="border border-neutral-800 rounded-lg p-4">
            <p className="text-sm text-neutral-500">Accepted</p>
            <p className="text-2xl font-bold text-green-500">{usedCount}</p>
          </div>
        </div>

        {/* Create Invite */}
        <div className="border border-neutral-800 rounded-lg p-4">
          <h2 className="font-medium mb-4">Create New Invite</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-neutral-500 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-[#10B981] focus:outline-none"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm text-neutral-500 mb-1">
                Credits
              </label>
              <input
                type="number"
                placeholder="10"
                value={newCredits}
                onChange={(e) => setNewCredits(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-[#10B981] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sendEmail"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="sendEmail" className="text-sm text-neutral-400">
                Send email
              </label>
            </div>
            <button
              onClick={createInvite}
              disabled={isCreating}
              className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create Invite"}
            </button>
          </div>
        </div>

        {/* Invites Table */}
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-400">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-400">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-400">
                    Credits
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-400">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {invites.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-neutral-500"
                    >
                      No invites yet
                    </td>
                  </tr>
                ) : (
                  invites.map((invite) => (
                    <tr key={invite.id} className="hover:bg-neutral-900/50">
                      <td className="px-4 py-3 font-medium">{invite.email}</td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-neutral-800 px-2 py-1 rounded">
                          {invite.code}
                        </code>
                      </td>
                      <td className="px-4 py-3">{invite.creditsToGrant}</td>
                      <td className="px-4 py-3">
                        {invite.used ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-500">
                            Accepted
                          </span>
                        ) : invite.expiresAt &&
                          new Date(invite.expiresAt) < new Date() ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-500">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-500">
                            {invite.sentAt ? "Sent" : "Pending"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyInviteUrl(invite.code)}
                            className="p-2 hover:bg-neutral-800 rounded transition-colors"
                            title="Copy invite URL"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                              />
                            </svg>
                          </button>
                          {!invite.used && (
                            <button
                              onClick={() => revokeInvite(invite.id)}
                              className="p-2 hover:bg-red-500/20 text-red-500 rounded transition-colors"
                              title="Revoke invite"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
