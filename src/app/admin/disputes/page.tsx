"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, Scale, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Dispute = {
  id: string;
  deal_id: string;
  reason: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  deal: {
    id: string;
    title: string;
    total_amount: number;
    deal_link_slug: string;
    status: string;
    escrow_status: string;
  };
  initiator: { display_name: string | null } | null;
  client: { display_name: string | null; email: string | null } | null;
  freelancer: { display_name: string | null; email: string | null } | null;
};

const statusTabs = [
  { key: "open", label: "Open" },
  { key: "under_review", label: "Under Review" },
  { key: "resolved", label: "Resolved" },
];

const badgeMap: Record<string, { variant: "danger" | "warning" | "success" | "outline"; label: string }> = {
  open: { variant: "danger", label: "Open" },
  under_review: { variant: "warning", label: "Under Review" },
  resolved_release: { variant: "success", label: "Released" },
  resolved_refund: { variant: "outline", label: "Refunded" },
  resolved_partial: { variant: "warning", label: "Split" },
};

function daysAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function AdminDisputesPage() {
  const [tab, setTab] = useState("open");
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/disputes?status=${tab}`)
      .then((r) => r.json())
      .then((data) => setDisputes(data.disputes || []))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div>
      {/* Tab filters */}
      <div className="mb-6 flex gap-2">
        {statusTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              tab === t.key
                ? "bg-brand text-white"
                : "bg-white text-slate-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16">
          <Scale className="mx-auto h-8 w-8 text-slate-400 mb-3" />
          <p className="text-sm text-slate-600">
            No {tab === "resolved" ? "resolved" : tab.replace("_", " ")} disputes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d, i) => {
            const badge = badgeMap[d.status] || badgeMap.open;
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <Link
                  href={`/admin/disputes/${d.id}`}
                  className="block cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition-colors duration-200 hover:border-gray-300"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {d.deal.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600">
                        {d.client?.display_name || "Client"} vs{" "}
                        {d.freelancer?.display_name || "Freelancer"}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Opened by {d.initiator?.display_name || "Unknown"} &middot;{" "}
                        {daysAgo(d.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                        ${(d.deal.total_amount / 100).toFixed(2)}
                      </span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
