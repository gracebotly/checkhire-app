"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Disputes", href: "/admin/disputes" },
  { label: "Users", href: "/admin/users" },
  { label: "Stats", href: "/admin/stats" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto max-w-6xl overflow-x-auto px-6">
      <div className="flex gap-6">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`cursor-pointer whitespace-nowrap border-b-2 pb-3 pt-2 text-sm font-medium transition-colors duration-200 ${
                active
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
