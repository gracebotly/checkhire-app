"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Deal = {
  id: string;
  title: string;
  total_amount: number;
  status: string;
  escrow_status: string;
  deal_link_slug: string;
  flagged_for_review: boolean;
  flagged_reason: string | null;
  created_at: string;
  updated_at: string;
  client: { display_name: string | null; email: string | null } | null;
  freelancer: { display_name: string | null; email: string | null } | null;
};

const statusBadgeMap: Record<
  string,
  { variant: "warning" | "success" | "default" | "danger" | "outline"; label: string }
> = {
  draft: { variant: "outline", label: "Draft" },
  pending_acceptance: { variant: "warning", label: "Awaiting Acceptance" },
  funded: { variant: "success", label: "Payment Secured" },
  in_progress: { variant: "default", label: "In Progress" },
  submitted: { variant: "warning", label: "Work Submitted" },
  revision_requested: { variant: "warning", label: "Revision Requested" },
  completed: { variant: "success", label: "Completed" },
  disputed: { variant: "danger", label: "Disputed" },
  cancelled: { variant: "outline", label: "Cancelled" },
  refunded: { variant: "outline", label: "Refunded" },
};

const escrowLabels: Record<string, string> = {
  unfunded: "Unfunded",
  funded: "Funded",
  partially_released: "Partially Released",
  fully_released: "Fully Released",
  refunded: "Refunded",
  frozen: "Frozen",
};

const filterTabs = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "funded", label: "Funded" },
  { key: "flagged", label: "Flagged" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminDealsPage() {
  const [filter, setFilter] = useState("all");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ filter, page: String(page) });
    fetch(`/api/admin/deals?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setDeals(data.deals || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [filter, page]);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setFilter(t.key);
              setPage(1);
            }}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              filter === t.key
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
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="mx-auto h-8 w-8 text-slate-400 mb-3" />
          <p className="text-sm text-slate-600">No deals found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal, i) => {
            const badge = statusBadgeMap[deal.status] || statusBadgeMap.draft;
            return (
              <motion.div
                key={deal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {deal.title}
                      </h3>
                      <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                        ${(deal.total_amount / 100).toFixed(2)}
                      </span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {deal.flagged_for_review && (
                        <Badge variant="warning">Flagged for Review</Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600">
                      Client: {deal.client?.display_name || "Unknown"}{" "}
                      {deal.client?.email && (
                        <span className="text-slate-400">
                          ({deal.client.email})
                        </span>
                      )}
                      {"  →  "}
                      {deal.freelancer ? (
                        <>
                          Freelancer: {deal.freelancer.display_name || "Unknown"}{" "}
                          {deal.freelancer.email && (
                            <span className="text-slate-400">
                              ({deal.freelancer.email})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">
                          Awaiting freelancer
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Escrow: {escrowLabels[deal.escrow_status] || deal.escrow_status}
                      {"  |  "}
                      Created: {formatDate(deal.created_at)}
                      {"  |  "}
                      Updated: {formatDate(deal.updated_at)}
                    </p>
                  </div>
                </div>
                {deal.flagged_for_review && deal.flagged_reason && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-semibold text-amber-800">Flagged for review</p>
                    <p className="mt-1 text-xs text-amber-700">{deal.flagged_reason}</p>
                  </div>
                )}
                <Link
                  href={`/deal/${deal.deal_link_slug}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-brand transition-colors duration-200 hover:text-brand-hover"
                >
                  View deal <ExternalLink className="h-3 w-3" />
                </Link>
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
