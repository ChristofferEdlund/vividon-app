"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeftIcon, SearchIcon } from "@/components/Icons"

interface User {
  id: string
  email: string
  creditsRemaining: number
  creditsUsedTotal: number
  subscriptionTier: string
  isApproved: boolean
  isBlocked: boolean
  isAdmin: boolean
  createdAt: string
  updatedAt: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingCredits, setEditingCredits] = useState<string | null>(null)
  const [newCredits, setNewCredits] = useState("")

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (search) {
      setFilteredUsers(
        users.filter((user) =>
          user.email.toLowerCase().includes(search.toLowerCase())
        )
      )
    } else {
      setFilteredUsers(users)
    }
  }, [search, users])

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (res.status === 403) {
        router.push("/dashboard")
        return
      }
      if (!res.ok) throw new Error("Failed to load users")
      const data = await res.json()
      setUsers(data.users)
      setFilteredUsers(data.users)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, updates }),
      })

      if (!res.ok) throw new Error("Failed to update user")

      const data = await res.json()
      setUsers(users.map((u) => (u.id === userId ? { ...u, ...data.user } : u)))

      toast({
        title: "Updated",
        description: "User updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const toggleApproval = (user: User) => {
    updateUser(user.id, { isApproved: !user.isApproved })
  }

  const toggleBlocked = (user: User) => {
    updateUser(user.id, { isBlocked: !user.isBlocked })
  }

  const saveCredits = (userId: string) => {
    const credits = parseInt(newCredits, 10)
    if (isNaN(credits) || credits < 0) {
      toast({
        title: "Error",
        description: "Invalid credit amount",
        variant: "destructive",
      })
      return
    }
    updateUser(userId, { creditsRemaining: credits })
    setEditingCredits(null)
    setNewCredits("")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const approvedCount = users.filter((u) => u.isApproved).length
  const blockedCount = users.filter((u) => u.isBlocked).length
  const totalCredits = users.reduce((sum, u) => sum + u.creditsRemaining, 0)
  const totalUsed = users.reduce((sum, u) => sum + u.creditsUsedTotal, 0)

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold">User Management</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-green-500">{approvedCount}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Blocked</p>
            <p className="text-2xl font-bold text-red-500">{blockedCount}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Credits Used</p>
            <p className="text-2xl font-bold text-blue-500">{totalUsed}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {search ? "No users found" : "No users yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.email}</p>
                        {user.isAdmin && (
                          <span className="text-xs text-purple-500">Admin</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingCredits === user.id ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={newCredits}
                            onChange={(e) => setNewCredits(e.target.value)}
                            className="w-20 h-8"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveCredits(user.id)
                              if (e.key === "Escape") setEditingCredits(null)
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => saveCredits(user.id)}
                            className="h-8"
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingCredits(user.id)
                            setNewCredits(user.creditsRemaining.toString())
                          }}
                          className="text-green-500 hover:underline font-medium"
                        >
                          {user.creditsRemaining}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.creditsUsedTotal}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.isApproved ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-500">
                            Approved
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-500">
                            Pending
                          </span>
                        )}
                        {user.isBlocked && (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-500">
                            Blocked
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={user.isApproved ? "outline" : "default"}
                          onClick={() => toggleApproval(user)}
                        >
                          {user.isApproved ? "Revoke" : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleBlocked(user)}
                          className={user.isBlocked ? "text-red-500 border-red-500" : ""}
                        >
                          {user.isBlocked ? "Unblock" : "Block"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      </div>
    </div>
  )
}
