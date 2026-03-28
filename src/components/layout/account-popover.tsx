"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Settings, LogOut, Copy } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface AccountCardProps {
  email: string
  settingsPath?: string
}

export function AccountCardPanel({ email, settingsPath = "/employer/settings" }: AccountCardProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <div className="w-72 rounded-xl border border-gray-200 bg-white shadow-xl outline-none">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-slate-900">{email}</p>
          <button
            onClick={copyEmail}
            className="shrink-0 cursor-pointer rounded p-0.5 text-slate-600 transition-colors duration-200 hover:bg-gray-100 hover:text-slate-900"
            aria-label="Copy email"
          >
            <Copy size={12} />
          </button>
          {copied && (
            <span className="text-[10px] font-medium text-emerald-600">Copied</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-1.5">
        <button
          onClick={() => router.push(settingsPath)}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors duration-200 hover:bg-gray-50 hover:text-slate-900"
        >
          <Settings size={16} className="text-slate-600" />
          Settings
        </button>
      </div>

      {/* Log Out */}
      <div className="border-t border-gray-100 p-1.5">
        <button
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={16} className="text-slate-600" />
          Log Out
        </button>
      </div>
    </div>
  )
}
