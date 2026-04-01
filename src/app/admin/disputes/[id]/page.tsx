"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Image,
  FileText,
  Video,
  MessageSquare,
  Link as LinkIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

type DisputeDetail = {
  id: string;
  deal_id: string;
  initiated_by: string;
  reason: string;
  status: string;
  resolution_notes: string | null;
  resolution_amount: number | null;
  dispute_fee_amount: number | null;
  dispute_fee_charged_to: string | null;
  created_at: string;
  resolved_at: string | null;
  deal: {
    id: string;
    title: string;
    description: string;
    deliverables: string | null;
    total_amount: number;
    deal_link_slug: string;
    status: string;
    escrow_status: string;
    client_user_id: string;
    freelancer_user_id: string | null;
    has_milestones: boolean;
    created_at: string;
  };
};

type EvidenceItem = {
  id: string;
  submitted_by: string;
  evidence_type: string;
  file_url: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  description: string | null;
  created_at: string;
};

type ActivityItem = {
  id: string;
  entry_type: string;
  content: string | null;
  created_at: string;
  user: { display_name: string | null } | null;
};

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
  trust_badge: string;
  completed_deals_count: number;
  email: string;
};

const evidenceIcons: Record<string, typeof Image> = {
  screenshot: Image,
  file: FileText,
  video: Video,
  text: MessageSquare,
  link: LinkIcon,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const badgeMap: Record<string, { variant: "danger" | "warning" | "success" | "outline"; label: string }> = {
  open: { variant: "danger", label: "Open" },
  under_review: { variant: "warning", label: "Under Review" },
  resolved_release: { variant: "success", label: "Released" },
  resolved_refund: { variant: "outline", label: "Refunded" },
  resolved_partial: { variant: "warning", label: "Split" },
};

export default function AdminDisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [client, setClient] = useState<Profile | null>(null);
  const [freelancer, setFreelancer] = useState<Profile | null>(null);

  // Resolution form
  const [resolution, setResolution] = useState("release");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [partialAmount, setPartialAmount] = useState("");
  const [applyFee, setApplyFee] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [settingUnderReview, setSettingUnderReview] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/disputes/${id}`);
      const data = await res.json();
      if (data.ok) {
        setDispute(data.dispute);
        setEvidence(data.evidence || []);
        setActivity(data.activity || []);
        setClient(data.client);
        setFreelancer(data.freelancer);
      }
    } catch {
      toast("Failed to load dispute", "error");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSetUnderReview = async () => {
    setSettingUnderReview(true);
    try {
      const res = await fetch(`/api/admin/disputes/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "under_review" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message || "Failed to update status", "error");
        return;
      }
      toast("Status set to Under Review", "success");
      fetchData();
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSettingUnderReview(false);
    }
  };

  const handleResolve = async () => {
    if (!dispute) return;
    setResolving(true);
    try {
      const totalAmount = dispute.deal.total_amount;
      const body: Record<string, unknown> = {
        resolution,
        resolution_notes: resolutionNotes,
        apply_dispute_fee: applyFee,
      };
      if (resolution === "partial") {
        body.resolution_amount = Math.round(parseFloat(partialAmount) * 100);
      }

      const res = await fetch(`/api/admin/disputes/${id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message || "Failed to resolve", "error");
        return;
      }
      toast("Dispute resolved", "success");
      setConfirmOpen(false);
      fetchData();
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="mx-auto h-8 w-8 text-slate-400 mb-3" />
        <p className="text-sm text-slate-600">Dispute not found.</p>
      </div>
    );
  }

  const deal = dispute.deal;
  const badge = badgeMap[dispute.status] || badgeMap.open;
  const isOpenOrReview = dispute.status === "open" || dispute.status === "under_review";
  const totalDollars = (deal.total_amount / 100).toFixed(2);
  const partialCents = Math.round(parseFloat(partialAmount || "0") * 100);
  const refundDollars = resolution === "partial"
    ? ((deal.total_amount - partialCents) / 100).toFixed(2)
    : "0.00";
  const feeAmount = applyFee ? (deal.total_amount * 0.05 / 100).toFixed(2) : "0.00";

  const clientEvidence = evidence.filter((e) => e.submitted_by === deal.client_user_id);
  const freelancerEvidence = evidence.filter((e) => e.submitted_by === deal.freelancer_user_id);

  const renderEvidenceCard = (item: EvidenceItem) => {
    const Icon = evidenceIcons[item.evidence_type] || FileText;
    return (
      <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-600" />
          <div className="min-w-0 flex-1">
            {item.description && (
              <p className="text-sm text-slate-700">{item.description}</p>
            )}
            {item.evidence_type === "screenshot" && item.file_url && (
              <img src={item.file_url} alt="Evidence" className="mt-2 max-h-40 rounded-lg border border-gray-200 object-cover" />
            )}
            {item.evidence_type === "video" && item.file_url && (
              <video src={item.file_url} controls className="mt-2 w-full max-h-40 rounded-lg" />
            )}
            {item.evidence_type === "file" && item.file_url && (
              <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-brand hover:underline">
                <FileText className="h-3.5 w-3.5" />
                {item.file_name || "Download"}{" "}
                {item.file_size_bytes && <span className="text-xs text-slate-600">({formatBytes(item.file_size_bytes)})</span>}
              </a>
            )}
            {item.evidence_type === "link" && item.file_url && (
              <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-brand hover:underline break-all">
                <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                {item.file_url}
              </a>
            )}
            <p className="mt-1 text-xs text-slate-600">{formatDate(item.created_at)}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Link
        href="/admin/disputes"
        className="inline-flex items-center gap-1 text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Disputes
      </Link>

      {/* 1. Deal Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold font-display text-slate-900">{deal.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {client?.display_name || "Client"} vs {freelancer?.display_name || "Freelancer"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono tabular-nums text-lg font-semibold text-slate-900">
              ${totalDollars}
            </span>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
        </div>
        <Link
          href={`/deal/${deal.deal_link_slug}`}
          className="mt-3 inline-flex items-center gap-1 text-sm text-brand transition-colors duration-200 hover:text-brand-hover"
        >
          View deal page <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 2. Dispute Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Dispute Reason</h2>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{dispute.reason}</p>
        <p className="mt-3 text-xs text-slate-600">
          Opened {formatDate(dispute.created_at)}
        </p>
      </div>

      {/* 3. Activity Log */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Activity Log</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-slate-600">No activity.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {activity.map((a) => (
              <div
                key={a.id}
                className={`rounded-lg px-3 py-2 text-xs ${
                  a.entry_type === "system" ? "bg-gray-50 text-slate-600" : "text-slate-700"
                }`}
              >
                {a.user?.display_name && (
                  <span className="font-medium text-slate-900">{a.user.display_name}: </span>
                )}
                {a.content}
                <span className="ml-2 text-slate-400">{formatDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Evidence Review */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Evidence</h2>
        {evidence.length === 0 ? (
          <p className="text-sm text-slate-600">No evidence submitted.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-slate-600 mb-3">
                {client?.display_name || "Client"}&apos;s Evidence ({clientEvidence.length})
              </p>
              <div className="space-y-3">
                {clientEvidence.length === 0 ? (
                  <p className="text-xs text-slate-600">None submitted.</p>
                ) : (
                  clientEvidence.map(renderEvidenceCard)
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 mb-3">
                {freelancer?.display_name || "Freelancer"}&apos;s Evidence ({freelancerEvidence.length})
              </p>
              <div className="space-y-3">
                {freelancerEvidence.length === 0 ? (
                  <p className="text-xs text-slate-600">None submitted.</p>
                ) : (
                  freelancerEvidence.map(renderEvidenceCard)
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Resolution Panel */}
      {isOpenOrReview && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Resolution</h2>

          {dispute.status === "open" && (
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetUnderReview}
                disabled={settingUnderReview}
              >
                {settingUnderReview ? "Updating..." : "Set Under Review"}
              </Button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="resolution-decision" className="block text-xs font-medium text-slate-600 mb-1">
                Decision
              </label>
              <select
                id="resolution-decision"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="release">Release to Freelancer</option>
                <option value="refund">Refund to Client</option>
                <option value="partial">Partial Split</option>
              </select>
            </div>

            {resolution === "partial" && (
              <div>
                <label htmlFor="partial-amount" className="block text-xs font-medium text-slate-600 mb-1">
                  Freelancer receives ($)
                </label>
                <input
                  id="partial-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={(deal.total_amount / 100).toFixed(2)}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 font-mono focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="0.00"
                />
                <p className="mt-1 text-xs text-slate-600">
                  Client refund: <span className="font-mono">${refundDollars}</span> of{" "}
                  <span className="font-mono">${totalDollars}</span> total
                </p>
              </div>
            )}

            <div>
              <label htmlFor="resolution-notes" className="block text-xs font-medium text-slate-600 mb-1">
                Resolution Notes (required)
              </label>
              <textarea
                id="resolution-notes"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value.slice(0, 5000))}
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="Explain your decision..."
              />
              <p className="mt-1 text-xs text-slate-600 text-right">{resolutionNotes.length}/5000</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyFee}
                onChange={(e) => setApplyFee(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
              />
              <span className="text-sm text-slate-700">
                Apply dispute fee (5% = ${feeAmount})
              </span>
            </label>

            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!resolutionNotes.trim() || (resolution === "partial" && !partialAmount)}
            >
              Resolve Dispute
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader title="Confirm Resolution" />
          <div className="px-6 pb-6 space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                This action will execute Stripe transfers/refunds and cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <DialogClose asChild>
                <Button variant="ghost" size="sm">Cancel</Button>
              </DialogClose>
              <Button
                variant="danger"
                size="sm"
                onClick={handleResolve}
                disabled={resolving}
              >
                {resolving ? "Processing..." : "Confirm Resolution"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
