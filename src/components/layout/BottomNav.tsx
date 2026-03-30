"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Search, PlusCircle, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs: {
  label: string;
  icon: typeof Briefcase;
  href: string;
  prominent?: boolean;
}[] = [
  { label: "My Gigs", icon: Briefcase, href: "/dashboard" },
  { label: "Browse", icon: Search, href: "/gigs" },
  { label: "Post", icon: PlusCircle, href: "/deal/new", prominent: true },
  { label: "Profile", icon: User, href: "/profile" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden">
      <div className="flex h-16 items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href === "/profile" && pathname.startsWith("/u/")) ||
            (tab.href === "/gigs" && pathname === "/gigs");
          const Icon = tab.icon;

          return (
            <Link
              key={tab.label}
              href={tab.href}
              prefetch={false}
              className={cn(
                "flex flex-1 cursor-pointer flex-col items-center gap-1 py-2 text-xs font-medium transition-colors duration-200",
                isActive ? "text-brand" : "text-slate-600"
              )}
            >
              {tab.prominent ? (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand">
                  <Icon className="h-4 w-4 text-white" />
                </span>
              ) : (
                <Icon className="h-5 w-5" />
              )}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
