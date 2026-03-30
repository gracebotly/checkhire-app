"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Star,
  Users,
  Scale,
} from "lucide-react";

type Stats = {
  total_deals: number;
  active_deals: number;
  completed_deals: number;
  total_volume_cents: number;
  average_deal_size_cents: number;
  dispute_rate: number;
  average_rating: number | null;
  active_users_30d: number;
  open_disputes: number;
  total_users: number;
};

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => setStats(data.stats || null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <p className="text-center text-sm text-slate-600 py-16">
        Failed to load stats.
      </p>
    );
  }

  const cards = [
    {
      label: "Total Deals",
      value: stats.total_deals.toLocaleString(),
      icon: FileText,
      highlight: false,
    },
    {
      label: "Active Deals",
      value: stats.active_deals.toLocaleString(),
      icon: Clock,
      highlight: false,
    },
    {
      label: "Completed Deals",
      value: stats.completed_deals.toLocaleString(),
      icon: CheckCircle,
      highlight: false,
    },
    {
      label: "Total Volume",
      value: `$${(stats.total_volume_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
      icon: DollarSign,
      highlight: false,
    },
    {
      label: "Avg Deal Size",
      value: `$${(stats.average_deal_size_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
      icon: TrendingUp,
      highlight: false,
    },
    {
      label: "Dispute Rate",
      value: `${(stats.dispute_rate * 100).toFixed(1)}%`,
      icon: AlertTriangle,
      highlight: stats.dispute_rate > 0.05,
    },
    {
      label: "Avg Rating",
      value: stats.average_rating ? `${stats.average_rating.toFixed(1)} / 5.0` : "N/A",
      icon: Star,
      highlight: false,
    },
    {
      label: "Active Users (30d)",
      value: stats.active_users_30d.toLocaleString(),
      icon: Users,
      highlight: false,
    },
    {
      label: "Total Users",
      value: stats.total_users.toLocaleString(),
      icon: Users,
      highlight: false,
    },
    {
      label: "Open Disputes",
      value: stats.open_disputes.toLocaleString(),
      icon: Scale,
      highlight: stats.open_disputes > 0,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  card.highlight ? "bg-red-50" : "bg-brand-muted"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    card.highlight ? "text-red-600" : "text-brand"
                  }`}
                />
              </div>
            </div>
            <p
              className={`text-2xl font-bold font-mono tabular-nums ${
                card.highlight ? "text-red-600" : "text-slate-900"
              }`}
            >
              {card.value}
            </p>
            <p className="mt-1 text-sm text-slate-600">{card.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
