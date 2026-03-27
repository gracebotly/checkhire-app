"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import {
  Building2,
  CreditCard,
  Users,
  AlertTriangle,
} from "lucide-react";
import { WorkspaceTab } from "@/components/settings/WorkspaceTab";
import { TeamTab } from "@/components/settings/TeamTab";
import { DangerTab } from "@/components/settings/DangerTab";

type TabKey = "company" | "team" | "danger";

const TABS: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: "company", label: "Company Profile", icon: Building2 },
  { key: "team", label: "Team", icon: Users },
  { key: "danger", label: "Danger Zone", icon: AlertTriangle },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as TabKey | null;
  const activeTab =
    tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : "company";

  const handleTabChange = useCallback(
    (tab: TabKey) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Settings"
        subtitle="Manage your company profile and team."
      />

      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-1 py-3 text-sm font-medium transition ${
                    isActive
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === "company" && <WorkspaceTab />}
          {activeTab === "team" && <TeamTab />}
          {activeTab === "danger" && <DangerTab />}
        </div>
      </div>
    </div>
  );
}
