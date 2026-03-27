"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Briefcase,
  FileText,
  MessageSquare,
  Settings as SettingsIcon,
} from "lucide-react"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const NAV: NavItem[] = [
  { href: "/employer/dashboard", label: "Dashboard", icon: Briefcase },
  { href: "/employer/listings", label: "Listings", icon: FileText },
  { href: "/employer/messages", label: "Messages", icon: MessageSquare },
  { href: "/employer/settings", label: "Settings", icon: SettingsIcon },
]

export function EmployerSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="sticky top-0 flex h-screen w-16 flex-col items-center border-r border-white/10 py-4"
      style={{ backgroundColor: "hsl(var(--sidebar-bg))" }}
      aria-label="Employer Sidebar"
    >
      <nav className="flex flex-1 flex-col items-center gap-2">
        {NAV.map((item) => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                active
                  ? "bg-blue-500 text-white"
                  : "text-gray-400 hover:bg-white/5"
              )}
            >
              <Icon size={20} />
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
