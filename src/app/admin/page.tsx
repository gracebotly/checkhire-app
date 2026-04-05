"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  FileText,
  Scale,
  Search,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  Wallet,
  TrendingUp,
} from "lucide-react";

type Dashboard = {
  pending_review: number;
  open_disputes: number;
  escalated_disputes: number;
  pending_scam_checks: number;
  pending_payouts: number;
  flagged_deals: number;
  recent_funded_count: number;
  recent_funded_volume_cents: number;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((res) => setData(res.dashboard || null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="py-16 text-center text-sm text-slate-600">
        Failed to load dashboard.
      </p>
    );
  }

  // Items that need attention (red/amber if count > 0)
  const attentionItems = [
    {
      label: "Deals Pending Review",
      count: data.pending_review,
      icon: FileText,
      href: "/admin/deals",
      urgent: data.pending_review > 0,
    },
    {
      label: "Flagged (High Risk)",
      count: data.flagged_deals,
      icon: ShieldAlert,
      href: "/admin/deals",
      urgent: data.flagged_deals > 0,
    },
    {
      label: "Open Disputes",
      count: data.open_disputes,
      icon: Scale,
      href: "/admin/disputes",
      urgent: data.open_disputes > 0,
    },
    {
      label: "Escalated Disputes",
      count: data.escalated_disputes,
      icon: AlertTriangle,
      href: "/admin/disputes",
      urgent: data.escalated_disputes > 0,
    },
    {
      label: "Scam Checks Pending",
      count: data.pending_scam_checks,
      icon: Search,
      href: "/admin/scam-checks",
      urgent: data.pending_scam_checks > 0,
    },
    {
      label: "Referral Payouts Pending",
      count: data.pending_payouts,
      icon: Wallet,
      href: "/admin/referrals",
      urgent: data.pending_payouts > 0,
    },
  ];

  const totalAttention = attentionItems.reduce((s, i) => s + i.count, 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {totalAttention === 0
            ? "All clear — nothing needs your attention right now."
            : `${totalAttention} item${totalAttention === 1 ? "" : "s"} need${totalAttention === 1 ? "s" : ""} your attention.`}
        </p>
      </div>

      {/* Revenue highlight */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-6 rounded-xl border border-gray-200 bg-white p-5"
      >
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-muted">
            <TrendingUp className="h-4 w-4 text-brand" />
          </div>
          <p className="text-sm font-semibold text-slate-900">Last 7 Days</p>
          <DollarSign className="h-4 w-4 text-slate-600" />
        </div>
        <div className="flex items-baseline gap-4">
          <div>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900">
              ${(data.recent_funded_volume_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-600">escrow funded</p>
          </div>
          <div className="ml-4">
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900">
              {data.recent_funded_count}
            </p>
            <p className="text-xs text-slate-600">deals funded</p>
          </div>
          <div className="ml-4">
            <p className="font-mono tabular-nums text-2xl font-bold text-brand">
              ${((data.recent_funded_volume_cents * 0.05) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-600">platform fees (5%)</p>
          </div>
        </div>
      </motion.div>

      {/* Attention items grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {attentionItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            >
              <Link
                href={item.href}
                className={`block cursor-pointer rounded-xl border bg-white p-5 transition-colors duration-200 hover:border-gray-300 ${
                  item.urgent
                    ? "border-amber-200"
                    : "border-gray-200"
                }`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      item.urgent ? "bg-amber-50" : "bg-gray-50"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        item.urgent ? "text-amber-600" : "text-slate-600"
                      }`}
                    />
                  </div>
                </div>
                <p
                  className={`font-mono tabular-nums text-2xl font-bold ${
                    item.urgent ? "text-amber-600" : "text-slate-900"
                  }`}
                >
                  {item.count}
                </p>
                <p className="mt-1 text-sm text-slate-600">{item.label}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
