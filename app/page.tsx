import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <h1 className="text-4xl text-white mb-8">Vividon</h1>
      <p className="text-neutral-400 mb-8">Beta is live</p>
      <Link
        href="/signup"
        className="px-8 py-3 bg-[#3B82F6] text-white rounded-lg"
      >
        Sign up for Beta
      </Link>
    </div>
  )
}
