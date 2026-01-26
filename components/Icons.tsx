"use client"

import {
  Instagram as InstagramIcon,
  Linkedin as LinkedinIcon,
  ArrowLeft as ArrowLeftIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  LogOut as LogOutIcon,
} from "lucide-react"

// Re-export icons as client-only components to avoid RSC serialization issues
export function Instagram({ size = 24, className }: { size?: number; className?: string }) {
  return <InstagramIcon size={size} className={className} />
}

export function Linkedin({ size = 24, className }: { size?: number; className?: string }) {
  return <LinkedinIcon size={size} className={className} />
}

export function ArrowLeft({ className }: { className?: string }) {
  return <ArrowLeftIcon className={className} />
}

export function Download({ className }: { className?: string }) {
  return <DownloadIcon className={className} />
}

export function Search({ className }: { className?: string }) {
  return <SearchIcon className={className} />
}

export function Settings({ className }: { className?: string }) {
  return <SettingsIcon className={className} />
}

export function LogOut({ className }: { className?: string }) {
  return <LogOutIcon className={className} />
}
