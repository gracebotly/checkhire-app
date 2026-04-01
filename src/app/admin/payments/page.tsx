"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CreditCard,
  ExternalLink,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PaymentEntry = {
  id: string;
  deal_id: string;
  content: string;
  created_at: string;
  deal: {
    title: string;
    deal_link_slug: string;
    total_amount: number;
    escrow_status: string;
    status: string;
  };
};

const filterTabs = [
  { key: "all", label: "All" },
  { key: "funded", label: "Funded" },
  { key: "refunds", label: "Refunds" },
  { key: "chargebacks", label: "Chargebacks" },
  { key: "failures", label: "Failures" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getEventIcon(content: string) {
  const lower = content.toLowerCase();
  if (lower.includes("chargeback")) return ShieldAlert;
  if (lower.includes("failed") || lower.includes("expired")) return AlertTriangle;
  if (lower.includes("refund") || lower.includes("auto-refund")) return ArrowDownCircle;
  if (lower.includes("funded") || lower.includes("secured")) return ArrowUpCircle;
  if (lower.includes("auto-release")) return Clock;
  return CreditCard;
}

function getEventBadge(content: string): {
  variant: "success" | "warning" | "danger" | "default" | "outline";
  label: string;
} {
  const lower = content.toLowerCase();
  if (lower.includes("chargeback") && lower.includes("filed"))
    return { variant: "danger", label: "Chargeback" };
  if (lower.includes("chargeback") && lower.includes("resolved"))
    return { variant: "default", label: "Chargeback Resolved" };
  if (lower.includes("chargeback") && lower.includes("lost"))
    return { variant: "danger", label: "Chargeback Lost" };
  if (lower.includes("failed") || lower.includes("expired"))
    return { variant: "warning", label: "Failed" };
  if (lower.includes("refund"))
    return { variant: "outline", label: "Refund" };
  if (lower.includes("auto-release"))
    return { variant: "success", label: "Auto-Released" };
  if (lower.includes("funded") || lower.includes("secured"))
    return { variant: "success", label: "Funded" };
  return { variant: "default", label: "Payment Event" };
}

export default function AdminPaymentsPage() {
  const [filter, setFilter] = useState("all");
  const [entries, setEntries] = useState<PaymentEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ filter, page: String(page) });
    fetch(`/api/admin/payments?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [filter, page]);

  const pageSize = 30;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setFilter(t.key);
              setPage(1);
            }}
            className={`cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              filter === t.key
                ? "bg-brand text-white"
                : "border border-gray-200 bg-white text-slate-600 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center">
          <CreditCard className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-600">No payment events found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const Icon = getEventIcon(entry.content || "");
            const badge = getEventBadge(entry.content || "");
            const isAlert =
              badge.variant === "danger" || badge.variant === "warning";

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                className={`rounded-xl border bg-white p-4 ${
                  isAlert ? "border-red-200" : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isAlert ? "bg-red-50" : "bg-brand-muted"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isAlert ? "text-red-600" : "text-brand"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {entry.content}
                      </p>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span>{formatDate(entry.created_at)}</span>
                      <span>·</span>
                      <Link
                        href={`/deal/${entry.deal.deal_link_slug}`}
                        className="cursor-pointer inline-flex items-center gap-1 text-brand transition-colors duration-200 hover:text-brand-hover"
                      >
                        {entry.deal.title}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                      <span>·</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        ${(entry.deal.total_amount / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
