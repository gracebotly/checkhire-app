"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useLocalStorageBoolean } from "@/lib/use-local-storage"
import { AccountCardPanel } from "./account-popover"
import {
  Briefcase,
  FileText,
  MessageSquare,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  User,
  Search,
} from "lucide-react"
import * as Popover from "@radix-ui/react-popover"

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }

const NAV: NavItem[] = [
  { href: "/employer/dashboard", label: "Dashboard", icon: Briefcase },
  { href: "/employer/listings", label: "Listings", icon: FileText },
  { href: "/employer/applications", label: "Applications", icon: Search },
  { href: "/employer/messages", label: "Messages", icon: MessageSquare },
  { href: "/employer/settings", label: "Settings", icon: SettingsIcon },
]

interface SidebarProps {
  userEmail: string
  companyName: string
  companyLogoUrl: string | null
}

export function EmployerSidebar({
  userEmail,
  companyName,
  companyLogoUrl,
}: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useLocalStorageBoolean("ch_sidebar_collapsed", true)

  const width = collapsed ? 64 : 140
  const companyInitial = companyName?.charAt(0)?.toUpperCase() || "C"

  const NavEntry = ({ href, label, Icon, active }: { href: string; label: string; Icon: React.ComponentType<{ size?: number; className?: string }>; active: boolean }) => {
    const base = (
      <Link
        href={href}
        aria-label={label}
        className={cn(
          "mx-1 my-1 flex flex-col items-center gap-1 rounded-lg px-1.5 py-2 outline-none",
          "focus-visible:ring-2 focus-visible:ring-white/40",
          active ? "bg-blue-500 text-white" : "text-slate-600 hover:bg-white/5"
        )}
      >
        <Icon size={22} className={cn(active ? "text-white" : "text-slate-600")} />
        {!collapsed && <span className="text-[11px] font-medium leading-4 text-center">{label}</span>}
      </Link>
    )
    return collapsed ? (
      <Tooltip>
        <TooltipTrigger asChild>{base}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    ) : (
      base
    )
  }

  return (
    <TooltipProvider>
      <aside
        className="sticky top-0 flex h-screen flex-col justify-between"
        style={{ width, backgroundColor: "hsl(var(--sidebar-bg))" }}
        aria-label="Employer Sidebar"
      >
        {/* Header: company logo + toggle */}
        <div className="border-b border-white/10 p-2">
          <div className="flex items-center justify-between">
            {companyLogoUrl ? (
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={companyLogoUrl}
                  alt={companyName || "Company"}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white bg-blue-600"
              >
                {companyInitial}
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="ml-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-white/15 bg-white/5 text-white transition-colors duration-200 hover:bg-white/10"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col items-stretch overflow-y-auto py-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return <NavEntry key={item.href} href={item.href} label={item.label} Icon={Icon} active={active} />
          })}
        </nav>

        {/* Bottom: user icon + popover */}
        <div className="border-t border-white/10 p-2">
          <Popover.Root>
            <Popover.Trigger
              className="w-full cursor-pointer rounded-md text-center outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label="Open account menu"
            >
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gray-600">
                <User size={14} className="text-slate-200" />
              </div>
              {!collapsed && <div className="mt-1 truncate text-[11px] font-medium leading-tight text-slate-200">{companyName || "Account"}</div>}
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content side="right" align="end" sideOffset={12} className="z-50 outline-none">
                <AccountCardPanel email={userEmail} />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </aside>
    </TooltipProvider>
  )
}
