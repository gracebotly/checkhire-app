"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

type Submission = {
  id: string;
  url: string;
  platform: string;
  submitted_by_email: string | null;
  submitted_by_name: string | null;
  description: string | null;
  source: string;
  scam_type: string | null;
  status: string;
  reviewer_user_id: string | null;
  verdict_notes: string | null;
  verdict_summary: string | null;
  verdict_at: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

const filterTabs = [
  { key: "pending", label: "Pending" },
  { key: "investigating", label: "Investigating" },
  { key: "all", label: "All" },
  { key: "safe", label: "Safe" },
  { key: "suspicious", label: "Suspicious" },
  { key: "confirmed_scam", label: "Confirmed Scam" },
];

const statusBadgeMap: Record<string, { variant: "warning" | "success" | "danger" | "default" | "outline"; label: string }> = {
  pending: { variant: "warning", label: "Pending" },
  investigating: { variant: "default", label: "Investigating" },
  safe: { variant: "success", label: "Safe" },
  suspicious: { variant: "warning", label: "Suspicious" },
  confirmed_scam: { variant: "danger", label: "Confirmed Scam" },
};

const platformLabels: Record<string, string> = {
  reddit: "Reddit",
  facebook: "Facebook",
  discord: "Discord",
  twitter: "Twitter/X",
  craigslist: "Craigslist",
  linkedin: "LinkedIn",
  other: "Other",
};

const scamTypeLabels: Record<string, string> = {
  company_impersonation: "Company Impersonation",
  upfront_payment: "Upfront Payment",
  too_good_to_be_true: "Too Good to Be True",
  personal_info_harvesting: "Personal Info Harvesting",
  crypto_gift_card: "Crypto / Gift Card",
  not_sure: "Not Sure",
  other: "Other",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(text: string, max = 100) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export default function AdminScamChecksPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("pending");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("pending");
  const [editVerdictSummary, setEditVerdictSummary] = useState("");
  const [editVerdictNotes, setEditVerdictNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSubmissions = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ status: filter, page: String(page) });

    fetch(`/api/admin/scam-checks?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setSubmissions(data.submissions || []);
        setTotal(data.total || 0);
      })
      .catch(() => {
        toast("Failed to load submissions", "error");
      })
      .finally(() => setLoading(false));
  }, [filter, page, toast]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function openEditor(submission: Submission) {
    setExpandedId(submission.id);
    setEditStatus(submission.status);
    setEditVerdictSummary(submission.verdict_summary || "");
    setEditVerdictNotes(submission.verdict_notes || "");
  }

  async function saveSubmission(submissionId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/scam-checks/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          verdict_summary: editVerdictSummary.trim() || null,
          verdict_notes: editVerdictNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast(data.message || "Failed to update submission", "error");
        return;
      }

      toast("Submission updated", "success");
      setExpandedId(null);
      fetchSubmissions();
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setFilter(t.key);
              setPage(1);
              setExpandedId(null);
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

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="py-16 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-600">
            {filter === "pending" ? "All caught up" : "No submissions found"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((submission, i) => {
            const statusBadge = statusBadgeMap[submission.status] || { variant: "outline" as const, label: submission.status };
            const typeLabel = submission.scam_type ? scamTypeLabels[submission.scam_type] || submission.scam_type : null;
            const isExpanded = expandedId === submission.id;

            return (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{platformLabels[submission.platform] || submission.platform}</Badge>
                      <a
                        href={submission.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex max-w-full items-center gap-1 truncate text-sm font-semibold text-slate-900 transition-colors duration-200 hover:text-brand cursor-pointer"
                      >
                        <span className="truncate">{submission.url}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">Submitted: {formatDate(submission.created_at)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                    <Badge variant="outline">{submission.source}</Badge>
                  </div>
                </div>

                {submission.submitted_by_email && (
                  <p className="mt-2 text-xs text-slate-600">Submitter: {submission.submitted_by_email}</p>
                )}

                {submission.description && (
                  <p className="mt-2 text-sm text-slate-600">
                    {isExpanded ? submission.description : truncate(submission.description)}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {typeLabel && submission.scam_type !== "not_sure" && (
                      <Badge variant="warning">
                        <ShieldAlert className="h-3 w-3" />
                        {typeLabel}
                      </Badge>
                    )}
                    {submission.verdict_at && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <Clock className="h-3 w-3" />
                        Reviewed {formatDate(submission.verdict_at)}
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedId(null);
                      } else {
                        openEditor(submission);
                      }
                    }}
                    className="cursor-pointer transition-colors duration-200"
                  >
                    {isExpanded ? (
                      <>
                        Collapse <ChevronUp className="ml-1 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Expand <ChevronDown className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-900">Status</label>
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger className="w-full cursor-pointer transition-colors duration-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(statusBadgeMap).map((status) => (
                            <SelectItem key={status} value={status} className="cursor-pointer">
                              {statusBadgeMap[status].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-900">
                        Verdict summary (sent to submitter)
                      </label>
                      <textarea
                        rows={3}
                        value={editVerdictSummary}
                        onChange={(e) => setEditVerdictSummary(e.target.value)}
                        placeholder="Add a short summary of your verdict..."
                        className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors duration-200"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-900">
                        Internal notes (admin only)
                      </label>
                      <textarea
                        rows={4}
                        value={editVerdictNotes}
                        onChange={(e) => setEditVerdictNotes(e.target.value)}
                        placeholder="Add internal notes for admin reference..."
                        className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors duration-200"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setExpandedId(null)}
                        className="cursor-pointer transition-colors duration-200"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => saveSubmission(submission.id)}
                        disabled={saving}
                        className="cursor-pointer transition-colors duration-200"
                      >
                        {saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

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

      {!loading && submissions.length > 0 && filter === "pending" && (
        <div className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-600">
          <AlertTriangle className="h-3 w-3" />
          Pending queue updates in real time when refreshed.
        </div>
      )}

      {!loading && submissions.length > 0 && filter !== "pending" && (
        <div className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-600">
          <CheckCircle2 className="h-3 w-3" />
          Showing {submissions.length} of {total} submissions.
        </div>
      )}
    </div>
  );
}
