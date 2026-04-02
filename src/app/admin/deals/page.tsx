"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  ExternalLink,
  CheckCircle2,
  MessageSquare,
  XCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

// ─── Types ───

type ModerationLogEntry = {
  action: string;
  notes: string | null;
  created_at: string;
};

type Deal = {
  id: string;
  title: string;
  total_amount: number;
  status: string;
  escrow_status: string;
  deal_link_slug: string;
  flagged_for_review: boolean;
  flagged_reason: string | null;
  review_status: string;
  review_notes: string | null;
  risk_score: number;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  client: { display_name: string | null; email: string | null } | null;
  freelancer: { display_name: string | null; email: string | null } | null;
  moderation_log: ModerationLogEntry[];
};

// ─── Constants ───

const statusBadgeMap: Record<
  string,
  {
    variant: "warning" | "success" | "default" | "danger" | "outline";
    label: string;
  }
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
  { key: "pending_review", label: "Needs Review" },
  { key: "changes_requested", label: "Changes Requested" },
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "funded", label: "Funded" },
  { key: "flagged", label: "All Flagged" },
];

const rejectionCategories = [
  { value: "violates_terms", label: "Violates Terms of Service" },
  { value: "suspected_scam", label: "Suspected Scam" },
  { value: "prohibited_content", label: "Prohibited Content" },
  { value: "duplicate_deal", label: "Duplicate Gig" },
  { value: "insufficient_detail", label: "Insufficient Detail" },
  { value: "other", label: "Other" },
];

// ─── Helpers ───

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RiskBadge({ score }: { score: number }) {
  if (score <= 0) return null;
  let bg: string;
  let text: string;
  if (score < 20) {
    bg = "bg-green-50 border-green-200";
    text = "text-green-700";
  } else if (score < 40) {
    bg = "bg-yellow-50 border-yellow-200";
    text = "text-yellow-700";
  } else if (score < 70) {
    bg = "bg-orange-50 border-orange-200";
    text = "text-orange-700";
  } else {
    bg = "bg-red-50 border-red-200";
    text = "text-red-700";
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-semibold tabular-nums ${bg} ${text}`}
    >
      <ShieldAlert className="h-3 w-3" />
      Risk: {score}
    </span>
  );
}

function ReviewStatusBadge({ status }: { status: string }) {
  if (status === "approved") return null;
  const map: Record<string, { variant: "warning" | "danger" | "default"; label: string }> = {
    pending: { variant: "warning", label: "Pending Review" },
    changes_requested: { variant: "default", label: "Changes Requested" },
    rejected: { variant: "danger", label: "Rejected" },
  };
  const badge = map[status];
  if (!badge) return null;
  return <Badge variant={badge.variant}>{badge.label}</Badge>;
}

// ─── Main Page ───

export default function AdminDealsPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("pending_review");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Request Changes dialog state
  const [changesDialogDealId, setChangesDialogDealId] = useState<string | null>(null);
  const [changesNotes, setChangesNotes] = useState("");

  // Reject dialog state
  const [rejectDialogDealId, setRejectDialogDealId] = useState<string | null>(null);
  const [rejectCategory, setRejectCategory] = useState("suspected_scam");
  const [rejectNotes, setRejectNotes] = useState("");

  // Expanded moderation history
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const fetchDeals = useCallback(() => {
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

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  // ── Moderation actions ──

  async function handleModerate(
    dealId: string,
    action: "approved" | "changes_requested" | "rejected",
    notes?: string,
    rejectionCategory?: string
  ) {
    setActionLoading(dealId);
    try {
      const res = await fetch(`/api/admin/deals/${dealId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notes: notes || undefined,
          rejection_category:
            action === "rejected" ? rejectionCategory : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast(data.message || "Moderation action failed", "error");
        return;
      }

      const actionLabels = {
        approved: "Deal approved",
        changes_requested: "Changes requested",
        rejected: "Deal rejected",
      };
      toast(actionLabels[action], "success");

      // Refresh the list
      fetchDeals();
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setActionLoading(null);
      setChangesDialogDealId(null);
      setChangesNotes("");
      setRejectDialogDealId(null);
      setRejectNotes("");
      setRejectCategory("suspected_scam");
    }
  }

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
            <div key={i} className="h-36 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-16">
          {filter === "pending_review" ? (
            <>
              <CheckCircle2 className="mx-auto h-8 w-8 text-green-500 mb-3" />
              <p className="text-sm text-slate-600">No deals awaiting review. You&apos;re all caught up.</p>
            </>
          ) : (
            <>
              <FileText className="mx-auto h-8 w-8 text-slate-600 mb-3" />
              <p className="text-sm text-slate-600">No deals found.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal, i) => {
            const badge =
              statusBadgeMap[deal.status] || statusBadgeMap.draft;
            const isActionable = deal.review_status !== "approved";
            const isLoading = actionLoading === deal.id;
            const hasHistory =
              deal.moderation_log && deal.moderation_log.length > 0;
            const historyExpanded = expandedHistoryId === deal.id;

            return (
              <motion.div
                key={deal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                {/* Header row */}
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
                      <ReviewStatusBadge status={deal.review_status} />
                      <RiskBadge score={deal.risk_score} />
                    </div>

                    <p className="mt-1.5 text-xs text-slate-600">
                      Client:{" "}
                      {deal.client?.display_name || "Unknown"}{" "}
                      {deal.client?.email && (
                        <span className="text-slate-600">
                          ({deal.client.email})
                        </span>
                      )}
                      {"  →  "}
                      {deal.freelancer ? (
                        <>
                          Freelancer:{" "}
                          {deal.freelancer.display_name || "Unknown"}{" "}
                          {deal.freelancer.email && (
                            <span className="text-slate-600">
                              ({deal.freelancer.email})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-600 italic">
                          Awaiting freelancer
                        </span>
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      Escrow:{" "}
                      {escrowLabels[deal.escrow_status] ||
                        deal.escrow_status}
                      {"  |  "}
                      Created: {formatDate(deal.created_at)}
                      {"  |  "}
                      Updated: {formatDate(deal.updated_at)}
                    </p>
                  </div>
                </div>

                {/* Flagged reason callout */}
                {deal.flagged_for_review && deal.flagged_reason && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-semibold text-amber-800">
                      Flagged for review
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      {deal.flagged_reason}
                    </p>
                  </div>
                )}

                {/* Previous review notes (if changes were requested before) */}
                {deal.review_status === "changes_requested" &&
                  deal.review_notes && (
                    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs font-semibold text-blue-800">
                        Changes requested
                      </p>
                      <p className="mt-1 text-xs text-blue-700">
                        {deal.review_notes}
                      </p>
                    </div>
                  )}

                {/* Action buttons — only when deal needs action */}
                {isActionable && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-green-600 hover:bg-green-700 cursor-pointer transition-colors duration-200"
                      disabled={isLoading}
                      onClick={() => handleModerate(deal.id, "approved")}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      {isLoading ? "..." : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-50 cursor-pointer transition-colors duration-200"
                      disabled={isLoading}
                      onClick={() => setChangesDialogDealId(deal.id)}
                    >
                      <MessageSquare className="mr-1 h-4 w-4" />
                      Request Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="cursor-pointer transition-colors duration-200"
                      disabled={isLoading}
                      onClick={() => setRejectDialogDealId(deal.id)}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}

                {/* Bottom row: View deal link + moderation history toggle */}
                <div className="mt-2 flex items-center justify-between">
                  <Link
                    href={`/deal/${deal.deal_link_slug}`}
                    className="inline-flex items-center gap-1 text-xs text-brand transition-colors duration-200 hover:text-brand-hover cursor-pointer"
                  >
                    View deal <ExternalLink className="h-3 w-3" />
                  </Link>

                  {hasHistory && (
                    <button
                      onClick={() =>
                        setExpandedHistoryId(
                          historyExpanded ? null : deal.id
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs text-slate-600 transition-colors duration-200 hover:text-slate-900 cursor-pointer"
                    >
                      <Clock className="h-3 w-3" />
                      History
                      {historyExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>

                {/* Moderation history (collapsible) */}
                <AnimatePresence>
                  {historyExpanded && hasHistory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                        <p className="text-xs font-semibold text-slate-900">
                          Moderation History
                        </p>
                        {deal.moderation_log.map((entry, idx) => {
                          const actionColors: Record<string, string> = {
                            approved: "text-green-700",
                            changes_requested: "text-blue-700",
                            rejected: "text-red-700",
                          };
                          const actionLabels: Record<string, string> = {
                            approved: "Approved",
                            changes_requested: "Changes Requested",
                            rejected: "Rejected",
                          };
                          return (
                            <div
                              key={idx}
                              className="flex items-start gap-2 text-xs"
                            >
                              <span className="text-slate-600 whitespace-nowrap">
                                {formatDateTime(entry.created_at)}
                              </span>
                              <span
                                className={`font-semibold ${actionColors[entry.action] || "text-slate-700"}`}
                              >
                                {actionLabels[entry.action] || entry.action}
                              </span>
                              {entry.notes && (
                                <span className="text-slate-600 truncate">
                                  — {entry.notes}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
            className="cursor-pointer transition-colors duration-200"
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
            className="cursor-pointer transition-colors duration-200"
          >
            Next
          </Button>
        </div>
      )}

      {/* ── Request Changes Dialog ── */}
      <Dialog
        open={changesDialogDealId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setChangesDialogDealId(null);
            setChangesNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader
            title="Request Changes"
            description="Tell the client what needs to be fixed. They'll see this message on their deal page and in an email."
          />
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors duration-200"
            rows={4}
            placeholder="e.g. Please add specific deliverables and a timeline..."
            value={changesNotes}
            onChange={(e) => setChangesNotes(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="cursor-pointer transition-colors duration-200"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors duration-200"
              disabled={!changesNotes.trim() || actionLoading !== null}
              onClick={() => {
                if (changesDialogDealId) {
                  handleModerate(
                    changesDialogDealId,
                    "changes_requested",
                    changesNotes.trim()
                  );
                }
              }}
            >
              {actionLoading ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ── */}
      <Dialog
        open={rejectDialogDealId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialogDealId(null);
            setRejectNotes("");
            setRejectCategory("suspected_scam");
          }
        }}
      >
        <DialogContent>
          <DialogHeader
            title="Reject Deal"
            description="This will permanently remove the deal. If funds are in escrow, they will be frozen for refund."
          />
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-900">
                Rejection reason
              </label>
              <Select
                value={rejectCategory}
                onValueChange={setRejectCategory}
              >
                <SelectTrigger className="w-full cursor-pointer transition-colors duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rejectionCategories.map((cat) => (
                    <SelectItem
                      key={cat.value}
                      value={cat.value}
                      className="cursor-pointer"
                    >
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-900">
                Additional notes (optional)
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors duration-200"
                rows={3}
                placeholder="Any additional context..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="cursor-pointer transition-colors duration-200"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="danger"
              className="cursor-pointer transition-colors duration-200"
              disabled={actionLoading !== null}
              onClick={() => {
                if (rejectDialogDealId) {
                  handleModerate(
                    rejectDialogDealId,
                    "rejected",
                    rejectNotes.trim() || undefined,
                    rejectCategory
                  );
                }
              }}
            >
              {actionLoading ? "Rejecting..." : "Reject Deal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
