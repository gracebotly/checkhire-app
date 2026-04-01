"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Image,
  FileText,
  Video,
  MessageSquare,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  Scale,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import { ScreenRecorder } from "@/components/gig/ScreenRecorder";
import { useToast } from "@/components/ui/toast";

type DisputeData = {
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
    funded_at: string | null;
    submitted_at: string | null;
    completed_at: string | null;
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
  user: { display_name: string | null; avatar_url: string | null } | null;
};

type MilestoneItem = {
  id: string;
  title: string;
  amount: number;
  status: string;
  position: number;
};

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
  trust_badge: string;
  completed_deals_count: number;
  email: string;
};

const statusBadge: Record<string, { variant: "danger" | "warning" | "success" | "outline"; label: string }> = {
  open: { variant: "danger", label: "Open" },
  under_review: { variant: "warning", label: "Under Review" },
  resolved_release: { variant: "success", label: "Resolved — Released" },
  resolved_refund: { variant: "outline", label: "Resolved — Refunded" },
  resolved_partial: { variant: "warning", label: "Resolved — Split" },
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

export default function DisputePage() {
  const { slug: id } = useParams<{ slug: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dispute, setDispute] = useState<DisputeData | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [client, setClient] = useState<Profile | null>(null);
  const [freelancer, setFreelancer] = useState<Profile | null>(null);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Evidence submission state
  const [evidenceType, setEvidenceType] = useState("screenshot");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  const fetchDispute = useCallback(async () => {
    try {
      const res = await fetch(`/api/disputes/${id}`);
      const data = await res.json();
      if (data.ok) {
        setDispute(data.dispute);
        setEvidence(data.evidence || []);
        setMilestones(data.milestones || []);
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
    fetchDispute();
  }, [fetchDispute]);

  const handleSubmitEvidence = async () => {
    setSubmittingEvidence(true);
    try {
      const formData = new FormData();
      formData.append("evidence_type", evidenceType);
      if (evidenceDescription) formData.append("description", evidenceDescription);

      if (["screenshot", "file", "video"].includes(evidenceType)) {
        if (!evidenceFile) {
          toast("Please select a file", "error");
          return;
        }
        formData.append("file", evidenceFile);
      } else if (evidenceType === "text") {
        if (!evidenceText.trim()) {
          toast("Please enter text content", "error");
          return;
        }
        formData.append("content", evidenceText);
      } else if (evidenceType === "link") {
        if (!evidenceUrl.trim()) {
          toast("Please enter a URL", "error");
          return;
        }
        formData.append("url", evidenceUrl);
      }

      const res = await fetch(`/api/disputes/${id}/evidence`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message || "Failed to submit evidence", "error");
        return;
      }
      toast("Evidence submitted", "success");
      setEvidenceFile(null);
      setEvidenceDescription("");
      setEvidenceText("");
      setEvidenceUrl("");
      fetchDispute();
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSubmittingEvidence(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-slate-400 mb-3" />
        <p className="text-sm text-slate-600">Dispute not found.</p>
      </div>
    );
  }

  const deal = dispute.deal;
  const badge = statusBadge[dispute.status] || statusBadge.open;
  const isResolved = dispute.status.startsWith("resolved_");
  const isOpen = dispute.status === "open" || dispute.status === "under_review";

  // Evidence deadline countdown
  const createdAt = new Date(dispute.created_at);
  const deadlineAt = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);
  const now = new Date();
  const hoursRemaining = Math.max(0, (deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60));
  const pastDeadline = hoursRemaining <= 0;

  // Separate evidence by submitter
  const myEvidence = evidence.filter(
    (e) => e.submitted_by === deal.client_user_id || e.submitted_by === deal.freelancer_user_id
  );
  const clientEvidence = evidence.filter((e) => e.submitted_by === deal.client_user_id);
  const freelancerEvidence = evidence.filter(
    (e) => e.submitted_by === deal.freelancer_user_id
  );

  const refundAmount = isResolved && dispute.resolution_amount !== null
    ? deal.total_amount - dispute.resolution_amount
    : 0;

  const acceptTypes: Record<string, string> = {
    screenshot: "image/*",
    file: "*/*",
    video: "video/*",
  };

  const renderEvidenceCard = (item: EvidenceItem) => {
    const Icon = evidenceIcons[item.evidence_type] || FileText;
    const submitterName =
      item.submitted_by === deal.client_user_id
        ? client?.display_name || "Client"
        : freelancer?.display_name || "Freelancer";

    return (
      <div
        key={item.id}
        className="rounded-xl border border-gray-200 bg-white p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Icon className="h-4 w-4 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-900 md:hidden">
              {submitterName}
            </p>
            {item.description && (
              <p className="text-sm text-slate-700 mt-1">{item.description}</p>
            )}
            {item.evidence_type === "screenshot" && item.file_url && (
              <button
                onClick={() => setLightboxUrl(item.file_url)}
                className="mt-2 cursor-pointer"
                aria-label="View full image"
              >
                <img
                  src={item.file_url}
                  alt="Evidence screenshot"
                  className="max-h-48 rounded-lg border border-gray-200 object-cover"
                />
              </button>
            )}
            {item.evidence_type === "video" && item.file_url && (
              <video
                src={item.file_url}
                controls
                className="mt-2 w-full max-h-48 rounded-lg border border-gray-200"
              />
            )}
            {item.evidence_type === "file" && item.file_url && (
              <a
                href={item.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm text-brand hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                {item.file_name || "Download file"}
                {item.file_size_bytes && (
                  <span className="text-xs text-slate-600">
                    ({formatBytes(item.file_size_bytes)})
                  </span>
                )}
              </a>
            )}
            {item.evidence_type === "link" && item.file_url && (
              <a
                href={item.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm text-brand hover:underline break-all"
              >
                <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                {item.file_url}
              </a>
            )}
            <p className="mt-2 text-xs text-slate-600">
              {formatDate(item.created_at)}
            </p>
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
      className="mx-auto max-w-4xl px-6 py-10"
    >
      {/* Back link */}
      <Link
        href={`/deal/${deal.deal_link_slug}`}
        className="inline-flex items-center gap-1 text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Gig
      </Link>

      {/* 1. Dispute Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-slate-900">
          Dispute — {deal.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <span className="font-mono tabular-nums text-lg font-semibold text-slate-900">
            ${(deal.total_amount / 100).toFixed(2)}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Opened on {formatDate(dispute.created_at)}
        </p>
      </div>

      {/* 2. Evidence Deadline Countdown */}
      {dispute.status === "open" && (
        <div className="mb-6">
          {!pastDeadline ? (
            <div
              className={`rounded-xl border p-4 ${
                hoursRemaining < 12
                  ? "border-red-200 bg-red-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  hoursRemaining < 12 ? "text-red-800" : "text-amber-800"
                }`}
              >
                Evidence submission closes in{" "}
                {Math.floor(hoursRemaining)}h{" "}
                {Math.floor((hoursRemaining % 1) * 60)}m
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Evidence submission period has ended.
            </p>
          )}
        </div>
      )}

      {/* 3. Dispute Reason */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">
          Reason for Dispute
        </h2>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">
          {dispute.reason}
        </p>
      </div>

      {/* 4. Deal Terms Reference (Collapsible) */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white">
        <button
          onClick={() => setTermsExpanded(!termsExpanded)}
          className="flex w-full cursor-pointer items-center justify-between p-5"
          aria-label={termsExpanded ? "Collapse deal terms" : "Expand deal terms"}
        >
          <h2 className="text-sm font-semibold text-slate-900">
            Deal Terms Reference
          </h2>
          {termsExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-600" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-600" />
          )}
        </button>
        {termsExpanded && (
          <div className="border-t border-gray-100 p-5 space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-600">Title</p>
              <p className="text-sm text-slate-900">{deal.title}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600">Description</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {deal.description}
              </p>
            </div>
            {deal.deliverables && (
              <div>
                <p className="text-xs font-medium text-slate-600">
                  Deliverables
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {deal.deliverables}
                </p>
              </div>
            )}
            {milestones.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">
                  Milestones
                </p>
                <div className="space-y-2">
                  {milestones.map((ms) => (
                    <div
                      key={ms.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <span className="text-sm text-slate-700">
                        {ms.position}. {ms.title}
                      </span>
                      <span className="font-mono tabular-nums text-sm text-slate-900">
                        ${(ms.amount / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activity.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">
                  Activity Log
                </p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {activity.map((a) => (
                    <div
                      key={a.id}
                      className={`rounded-lg px-3 py-2 text-xs ${
                        a.entry_type === "system"
                          ? "bg-gray-50 text-slate-600"
                          : "text-slate-700"
                      }`}
                    >
                      {a.user?.display_name && (
                        <span className="font-medium text-slate-900">
                          {a.user.display_name}:{" "}
                        </span>
                      )}
                      {a.content}
                      <span className="ml-2 text-slate-400">
                        {formatDate(a.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Evidence Timeline */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Evidence</h2>
        {evidence.length === 0 ? (
          <p className="text-sm text-slate-600">No evidence submitted yet.</p>
        ) : (
          <>
            {/* Desktop: two columns */}
            <div className="hidden md:grid md:grid-cols-2 md:gap-6">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-3">
                  {client?.display_name || "Client"}&apos;s Evidence
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
                  {freelancer?.display_name || "Freelancer"}&apos;s Evidence
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
            {/* Mobile: single column */}
            <div className="space-y-3 md:hidden">
              {evidence.map(renderEvidenceCard)}
            </div>
          </>
        )}
      </div>

      {/* 6. Submit Evidence */}
      {isOpen && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Submit Evidence
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="evidence-type" className="block text-xs font-medium text-slate-600 mb-1">
                Evidence Type
              </label>
              <select
                id="evidence-type"
                value={evidenceType}
                onChange={(e) => {
                  setEvidenceType(e.target.value);
                  setEvidenceFile(null);
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="screenshot">Screenshot / Image</option>
                <option value="file">Document / File</option>
                <option value="video">Video Recording</option>
                <option value="text">Text Description</option>
                <option value="link">External Link</option>
              </select>
            </div>

            {["screenshot", "file", "video"].includes(evidenceType) && (
              <div>
                <label htmlFor="evidence-file" className="block text-xs font-medium text-slate-600 mb-1">
                  Upload File (max 50MB)
                </label>
                <input
                  id="evidence-file"
                  type="file"
                  accept={acceptTypes[evidenceType]}
                  onChange={(e) =>
                    setEvidenceFile(e.target.files?.[0] || null)
                  }
                  className="w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand file:cursor-pointer"
                />
                {evidenceFile && (
                  <p className="mt-1 text-xs text-slate-600">
                    {evidenceFile.name} ({formatBytes(evidenceFile.size)})
                  </p>
                )}
                {evidenceType === "video" && (
                  <div className="mt-3">
                    <ScreenRecorder
                      disputeId={id}
                      onUploadComplete={() => fetchDispute()}
                    />
                  </div>
                )}
              </div>
            )}

            {evidenceType === "text" && (
              <div>
                <label htmlFor="evidence-text" className="block text-xs font-medium text-slate-600 mb-1">
                  Text Content
                </label>
                <textarea
                  id="evidence-text"
                  value={evidenceText}
                  onChange={(e) =>
                    setEvidenceText(e.target.value.slice(0, 2000))
                  }
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="Describe the evidence..."
                />
                <p className="mt-1 text-xs text-slate-600 text-right">
                  {evidenceText.length}/2000
                </p>
              </div>
            )}

            {evidenceType === "link" && (
              <div>
                <label htmlFor="evidence-url" className="block text-xs font-medium text-slate-600 mb-1">
                  URL
                </label>
                <input
                  id="evidence-url"
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="https://..."
                />
              </div>
            )}

            {evidenceType !== "text" && (
              <div>
                <label htmlFor="evidence-desc" className="block text-xs font-medium text-slate-600 mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="evidence-desc"
                  value={evidenceDescription}
                  onChange={(e) =>
                    setEvidenceDescription(e.target.value.slice(0, 2000))
                  }
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="Add context about this evidence..."
                />
              </div>
            )}

            <Button
              onClick={handleSubmitEvidence}
              disabled={submittingEvidence}
              size="sm"
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              {submittingEvidence ? "Submitting..." : "Submit Evidence"}
            </Button>
          </div>
        </div>
      )}

      {/* 7. Resolution Section */}
      {isResolved && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start gap-3 mb-4">
            {dispute.status === "resolved_release" && (
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            )}
            {dispute.status === "resolved_refund" && (
              <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
            )}
            {dispute.status === "resolved_partial" && (
              <Scale className="h-6 w-6 text-amber-600 flex-shrink-0" />
            )}
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {dispute.status === "resolved_release" &&
                  "Funds Released to Freelancer"}
                {dispute.status === "resolved_refund" &&
                  "Funds Refunded to Client"}
                {dispute.status === "resolved_partial" && "Partial Split"}
              </h2>
              {dispute.resolved_at && (
                <p className="text-xs text-slate-600">
                  Resolved on {formatDate(dispute.resolved_at)}
                </p>
              )}
            </div>
          </div>

          {dispute.resolution_notes && (
            <div className="mb-4 border-l-2 border-gray-200 pl-4">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {dispute.resolution_notes}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            {dispute.resolution_amount !== null && dispute.resolution_amount > 0 && (
              <div>
                <p className="text-xs text-slate-600">Freelancer received</p>
                <p className="font-mono tabular-nums font-semibold text-slate-900">
                  ${(dispute.resolution_amount / 100).toFixed(2)}
                </p>
              </div>
            )}
            {refundAmount > 0 && (
              <div>
                <p className="text-xs text-slate-600">Client refunded</p>
                <p className="font-mono tabular-nums font-semibold text-slate-900">
                  ${(refundAmount / 100).toFixed(2)}
                </p>
              </div>
            )}
            {dispute.dispute_fee_amount && dispute.dispute_fee_amount > 0 && (
              <div>
                <p className="text-xs text-slate-600">Dispute fee</p>
                <p className="font-mono tabular-nums text-sm text-slate-700">
                  ${(dispute.dispute_fee_amount / 100).toFixed(2)} charged to{" "}
                  {dispute.dispute_fee_charged_to}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      <Dialog
        open={!!lightboxUrl}
        onOpenChange={() => setLightboxUrl(null)}
      >
        <DialogContent>
          <DialogHeader title="Evidence" />
          <div className="p-4">
            {lightboxUrl && (
              <img
                src={lightboxUrl}
                alt="Evidence full size"
                className="w-full rounded-lg"
              />
            )}
          </div>
          <div className="flex justify-end px-4 pb-4">
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Close
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
