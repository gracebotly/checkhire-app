"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Building2,
  Briefcase,
  Users,
  Flag,
  AlertTriangle,
  Loader2,
  Clock,
  ChevronRight,
} from "lucide-react";

type AdminStats = {
  total_employers: number;
  active_listings: number;
  total_applications: number;
  pending_flags: number;
  pending_mlm_review: number;
  total_flags: number;
};

type RecentFlag = {
  id: string;
  target_type: string;
  reason: string;
  severity_weight: number;
  status: string;
  reporter_type: string;
  created_at: string;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentFlags, setRecentFlags] = useState<RecentFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setStats(data.stats);
          setRecentFlags(data.recent_flags || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
      </div>
    );
  }

  const statCards = [
    { label: "Employers", value: stats?.total_employers ?? 0, icon: Building2, color: "text-brand", bg: "bg-brand-muted" },
    { label: "Active Listings", value: stats?.active_listings ?? 0, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Applications", value: stats?.total_applications ?? 0, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Pending Flags", value: stats?.pending_flags ?? 0, icon: Flag, color: "text-red-600", bg: "bg-red-50", href: "/admin/flags" },
    { label: "MLM Review", value: stats?.pending_mlm_review ?? 0, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", href: "/admin/mlm-review" },
    { label: "Total Flags", value: stats?.total_flags ?? 0, icon: Flag, color: "text-slate-600", bg: "bg-slate-50" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900">Platform Overview</h1>
      <p className="mt-1 text-sm text-slate-600">Monitor platform health and review flagged content.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          const inner = (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04, ease: "easeOut" }}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600">{card.label}</p>
                  <p className="text-xl font-bold tabular-nums text-slate-900">{card.value}</p>
                </div>
              </div>
            </motion.div>
          );
          if ("href" in card && card.href) {
            return <Link key={card.label} href={card.href} className="cursor-pointer transition-colors duration-200 hover:opacity-90">{inner}</Link>;
          }
          return <div key={card.label}>{inner}</div>;
        })}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Flags</h2>
          <Link href="/admin/flags" className="flex cursor-pointer items-center gap-1 text-sm font-medium text-brand transition-colors duration-200 hover:text-brand-hover">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {recentFlags.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No flags yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {recentFlags.map((flag) => (
              <div key={flag.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                    flag.severity_weight >= 3 ? "border-red-200 bg-red-50 text-red-700" :
                    flag.severity_weight >= 2 ? "border-amber-200 bg-amber-50 text-amber-700" :
                    "border-gray-200 bg-gray-50 text-slate-600"
                  }`}>
                    {flag.reason.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-slate-600">{flag.target_type}</span>
                  <span className="text-xs text-slate-600">{flag.reporter_type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${
                    flag.status === "pending" ? "text-amber-600" :
                    flag.status === "investigating" ? "text-blue-600" :
                    flag.status === "resolved" ? "text-emerald-600" :
                    "text-slate-600"
                  }`}>
                    {flag.status}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <Clock className="h-3 w-3" />
                    {new Date(flag.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
