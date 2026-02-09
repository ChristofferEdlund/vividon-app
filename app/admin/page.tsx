"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeftIcon, DownloadIcon, SearchIcon, SettingsIcon, LogOutIcon } from "@/components/Icons"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface WaitlistEntry {
  id: string
  email: string
  created_at: string
}

export default function AdminPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<WaitlistEntry[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth")
        return
      }

      // Check admin role
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single()

      const isAdminData = profile?.is_admin ?? false
      setIsAdmin(isAdminData)
      setAuthLoading(false)

      if (isAdminData) {
        fetchWaitlist()
      } else {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, supabase])

  useEffect(() => {
    if (search) {
      setFilteredEntries(
        entries.filter((entry) =>
          entry.email.toLowerCase().includes(search.toLowerCase())
        )
      )
    } else {
      setFilteredEntries(entries)
    }
  }, [search, entries])

  const fetchWaitlist = async () => {
    const PAGE_SIZE = 1000
    let from = 0
    const all: WaitlistEntry[] = []

    while (true) {
      const { data, error } = await supabase
        .from("waitlist")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1)

      if (error) {
        setEntries([])
        setFilteredEntries([])
        setIsLoading(false)
        return
      }

      if (!data || data.length === 0) break

      all.push(...(data as WaitlistEntry[]))

      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    setEntries(all)
    setFilteredEntries(all)
    setIsLoading(false)
  }

  const exportToCSV = () => {
    const headers = ["Email", "Signed Up"]
    const csvContent = [
      headers.join(","),
      ...filteredEntries.map((entry) =>
        [entry.email, new Date(entry.created_at).toLocaleString()].join(",")
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `waitlist-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You need admin privileges to view this page.
          </p>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold">Waitlist Signups</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/invites">
              <Button variant="outline">Invites</Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline">User Management</Button>
            </Link>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <DownloadIcon className="h-4 w-4" />
              Export CSV
            </Button>
            <Link href="/admin/settings">
              <Button variant="ghost" size="icon">
                <SettingsIcon className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOutIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Signed Up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {search ? "No results found" : "No signups yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.email}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Total: {filteredEntries.length} signup
          {filteredEntries.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  )
}
