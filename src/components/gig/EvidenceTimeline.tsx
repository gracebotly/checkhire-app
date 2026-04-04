"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Bot,
  Lock,
  Paperclip,
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Circle,
  Briefcase,
  UserCheck,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/gig/CountdownTimer";
import { categoryLabels } from "@/lib/categories";
import type {
  ActivityLogEntryWithUser,
  DealWithParticipants,
  DealStatus,
  TimelineNodeVariant,
} from "@/types/database";

type Props = {
  entries: ActivityLogEntryWithUser[];
  deal: DealWithParticipants;
  role: "client" | "freelancer" | "visitor";
  guestFreelancerName: string | null;
  currentUserId: string | null;
  onConfirmDelivery: () => void;
  onRequestRevision: () => void;
  onOpenDispute: () => void;
  actionCard?: React.ReactNode;
};

// ── Timestamp formatting ──

function formatDualTime(dateStr: string): { absolute: string; relative: string } {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);

  let relative: string;
  if (mins < 1) relative = "just now";
  else if (mins < 60) relative = `${mins}m ago`;
  else {
    const hours = Math.floor(mins / 60);
    if (hours < 24) relative = `${hours}h ago`;
    else {
      const days = Math.floor(hours / 24);
      if (days < 30) relative = `${days}d ago`;
      else relative = "";
    }
  }

  const absolute = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return { absolute, relative };
}

function Timestamp({ dateStr }: { dateStr: string }) {
  const { absolute, relative } = formatDualTime(dateStr);
  return (
    <p className="text-xs text-slate-600 mt-0.5">
      {absolute}{relative ? ` · ${relative}` : ""}
    </p>
  );
}

// ── Helpers ──

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(name: string): boolean {
  return /\.(png|jpg|jpeg|gif|webp)$/i.test(name);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3).replace(/\s+\S*$/, "") + "...";
}

// ── Node variant detection ──

function getNodeVariant(entry: ActivityLogEntryWithUser, isFirst: boolean): TimelineNodeVariant {
  // First system entry that starts with "Gig created" → genesis
  if (isFirst && entry.entry_type === "system" && entry.content?.toLowerCase().startsWith("gig created")) {
    return "genesis";
  }

  if (entry.entry_type === "file" && entry.is_submission_evidence) return "evidence";
  if (entry.entry_type === "file") return "message";
  if (entry.entry_type === "text") return "message";

  if (entry.entry_type === "system" && entry.content) {
    const c = entry.content.toLowerCase();
    if (c.includes("escrow funded") || c.includes("payment secured") || (c.includes("milestone") && c.includes("funded")))
      return "payment";
    if (c.includes("submitted") || (c.includes("mark") && c.includes("complete")))
      return "submission";
    if (c.includes("confirmed") || c.includes("released") || c.includes("auto-released") || c.includes("complete"))
      return "resolution";
    if (c.includes("dispute")) return "dispute";
    if (c.includes("cancelled") || c.includes("refund")) return "resolution";
  }

  return "system";
}

// ── Node Icons ──

function NodeIcon({ variant }: { variant: TimelineNodeVariant }) {
  switch (variant) {
    case "genesis":
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-muted border-2 border-brand">
          <Briefcase className="h-4 w-4 text-brand" />
        </div>
      );
    case "payment":
      return (
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-brand-muted">
          <Lock className="h-4 w-4 text-brand" />
        </div>
      );
    case "evidence":
      return (
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
          <Paperclip className="h-4 w-4 text-green-700" />
        </div>
      );
    case "message":
      return (
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <MessageSquare className="h-4 w-4 text-slate-600" />
        </div>
      );
    case "submission":
      return (
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Send className="h-4 w-4 text-amber-700" />
        </div>
      );
    case "resolution":
      return (
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-5 w-5 text-green-700" />
        </div>
      );
    case "dispute":
      return (
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </div>
      );
    case "pending":
      return (
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white">
          <Circle className="h-3 w-3 text-gray-300" />
        </div>
      );
    default:
      return (
        <div className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <Bot className="h-3.5 w-3.5 text-slate-600" />
        </div>
      );
  }
}

// ── Genesis Node (the first node — summary card) ──

function GenesisNode({ deal, entry }: { deal: DealWithParticipants; entry: ActivityLogEntryWithUser }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex gap-3 relative"
    >
      <div className="z-10 shrink-0">
        <NodeIcon variant="genesis" />
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-semibold text-slate-900">{"📋"} Gig Posted</p>
            {deal.category && (
              <Badge variant="outline" className="text-xs">
                {categoryLabels[deal.category] || deal.category}
              </Badge>
            )}
          </div>
          <h3 className="text-base font-semibold text-slate-900">{deal.title}</h3>
          <p className="font-mono text-lg font-bold tabular-nums text-slate-900 mt-1">
            ${(deal.total_amount / 100).toFixed(2)}
          </p>
          {deal.deliverables && (
            <div className="mt-2">
              <p className="text-xs font-medium text-slate-600 mb-0.5">Deliverables</p>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">
                {truncate(deal.deliverables, 200)}
              </p>
            </div>
          )}
          {deal.deadline && (
            <p className="text-xs text-slate-600 mt-2">
              Deadline: {new Date(deal.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
          <Timestamp dateStr={entry.created_at} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Pending Node (greyed-out future steps) ──

function PendingNode({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex gap-3 relative opacity-50">
      <div className="z-10 shrink-0">
        <NodeIcon variant="pending" />
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-2 py-2">
          {icon}
          <p className="text-sm text-slate-600">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ── Timeline Node (existing entries) ──

function TimelineNode({
  entry,
  index,
  variant,
  deal,
  role,
  guestFreelancerName,
  currentUserId,
  onConfirmDelivery,
  onRequestRevision,
  onOpenDispute,
}: {
  entry: ActivityLogEntryWithUser;
  index: number;
  variant: TimelineNodeVariant;
  deal: DealWithParticipants;
  role: string;
  guestFreelancerName: string | null;
  currentUserId: string | null;
  onConfirmDelivery: () => void;
  onRequestRevision: () => void;
  onOpenDispute: () => void;
}) {
  const isClientEntry = entry.user_id === deal.client_user_id;

  const isPositiveResolution =
    variant === "resolution" &&
    entry.content &&
    (entry.content.toLowerCase().includes("confirmed") ||
      entry.content.toLowerCase().includes("released") ||
      entry.content.toLowerCase().includes("complete"));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, ...(variant === "submission" ? { x: 20 } : {}) }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{
        duration: variant === "payment" || variant === "resolution" ? 0.4 : 0.25,
        ease: "easeOut",
        delay: index * 0.04,
      }}
      className="flex gap-3 relative"
    >
      <div className="z-10 shrink-0">
        <NodeIcon variant={variant} />
      </div>

      <div className="flex-1 min-w-0 pb-1">
        {/* System node */}
        {variant === "system" && (
          <div>
            <p className="text-sm text-slate-600">{entry.content}</p>
            <Timestamp dateStr={entry.created_at} />
          </div>
        )}

        {/* Payment node */}
        {variant === "payment" && (
          <div className="bg-brand-muted border border-brand/20 rounded-xl p-4">
            <p className="text-base font-semibold text-brand">
              {"💰"} Payment Secured
            </p>
            <p className="font-mono text-2xl font-bold tabular-nums text-brand mt-1">
              ${(deal.total_amount / 100).toFixed(2)}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Held securely. Releases when work is confirmed.
            </p>
            <Timestamp dateStr={entry.created_at} />
          </div>
        )}

        {/* Evidence node */}
        {variant === "evidence" && (
          <div className="border-l-2 border-green-400 rounded-xl border border-gray-200 bg-white p-4 ml-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="success">Evidence</Badge>
              <span className="text-xs text-slate-600">
                {formatDualTime(entry.created_at).absolute}
              </span>
            </div>
            {entry.file_url && entry.file_name && isImageFile(entry.file_name) ? (
              <a href={entry.file_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={entry.file_url}
                  alt={entry.file_name}
                  className="max-h-[120px] rounded-lg object-cover"
                />
              </a>
            ) : entry.file_url ? (
              <a
                href={entry.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-brand cursor-pointer transition-colors duration-200 hover:text-brand-hover"
              >
                <FileText className="h-4 w-4" />
                <span>{entry.file_name || "File"}</span>
                {entry.file_size_bytes && (
                  <span className="text-xs text-slate-600">
                    {formatFileSize(entry.file_size_bytes)}
                  </span>
                )}
              </a>
            ) : null}
            {entry.content && (
              <p className="text-sm text-slate-900 mt-2 whitespace-pre-wrap">
                {entry.content}
              </p>
            )}
          </div>
        )}

        {/* Message node */}
        {variant === "message" && (
          <div
            className={`rounded-xl border border-gray-200 bg-white p-4 ${
              isClientEntry
                ? "border-l-2 border-l-blue-400"
                : "border-l-2 border-l-brand"
            }`}
          >
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm font-semibold text-slate-900">
                {entry.user?.display_name || guestFreelancerName || "Unknown"}
              </span>
              <span className="text-xs text-slate-600">
                {formatDualTime(entry.created_at).absolute}
              </span>
            </div>
            {entry.entry_type === "file" && entry.file_url ? (
              <>
                {entry.file_name && isImageFile(entry.file_name) ? (
                  <a href={entry.file_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={entry.file_url}
                      alt={entry.file_name}
                      className="max-h-[120px] rounded-lg object-cover mt-1"
                    />
                  </a>
                ) : (
                  <a
                    href={entry.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-brand cursor-pointer transition-colors duration-200 hover:text-brand-hover mt-1"
                  >
                    <FileText className="h-4 w-4" />
                    <span>{entry.file_name || "File"}</span>
                    {entry.file_size_bytes && (
                      <span className="text-xs text-slate-600">
                        {formatFileSize(entry.file_size_bytes)}
                      </span>
                    )}
                  </a>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-900 whitespace-pre-wrap">
                {entry.content}
              </p>
            )}
          </div>
        )}

        {/* Submission node */}
        {variant === "submission" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-base font-semibold text-amber-800 mb-2">
              {"⚡"} Work Submitted for Review
            </p>
            {deal.auto_release_at &&
              new Date(deal.auto_release_at) > new Date() && (
                <div className="mb-3">
                  <CountdownTimer
                    autoReleaseAt={deal.auto_release_at}
                    role={role === "client" ? "client" : "freelancer"}
                    onExpired={() => {}}
                  />
                </div>
              )}
            {role === "client" && deal.status === "submitted" && (
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <Button size="sm" onClick={onConfirmDelivery}>
                  Confirm Delivery
                </Button>
                <Button variant="outline" size="sm" onClick={onRequestRevision}>
                  Request Revision
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenDispute}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Open Dispute
                </Button>
              </div>
            )}
            <Timestamp dateStr={entry.created_at} />
          </div>
        )}

        {/* Resolution node — positive */}
        {variant === "resolution" && isPositiveResolution && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1], rotate: [0, -10, 0] }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="inline-block"
            >
              <CheckCircle className="h-6 w-6 text-green-700" />
            </motion.div>
            <p className="text-lg font-bold text-green-800 mt-2">
              {"🎉"}{" "}
              {entry.content?.toLowerCase().includes("auto-released")
                ? "Funds Auto-Released"
                : "Delivery Confirmed"}
            </p>
            <p className="font-mono text-2xl font-bold tabular-nums text-green-700 mt-1">
              ${(deal.total_amount / 100).toFixed(2)}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {role === "freelancer"
                ? "Funds on their way to your bank"
                : `Payment released to ${deal.freelancer?.display_name || guestFreelancerName || "freelancer"}`}
            </p>
            <Timestamp dateStr={entry.created_at} />
          </div>
        )}

        {/* Resolution node — neutral */}
        {variant === "resolution" && !isPositiveResolution && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-slate-600" />
              <p className="text-sm text-slate-900">{entry.content}</p>
            </div>
            <Timestamp dateStr={entry.created_at} />
          </div>
        )}

        {/* Dispute node */}
        {variant === "dispute" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-800">
              Dispute Opened
            </p>
            <p className="text-sm text-red-700 mt-1">Funds frozen</p>
            {entry.content && (
              <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
                {entry.content}
              </p>
            )}
            <Timestamp dateStr={entry.created_at} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Pending steps logic ──

function getPendingSteps(deal: DealWithParticipants): { label: string; icon: React.ReactNode }[] {
  const steps: { label: string; icon: React.ReactNode }[] = [];
  const s = deal.status;
  const e = deal.escrow_status;

  // Terminal states — no pending steps
  if (["completed", "cancelled", "refunded"].includes(s)) return steps;

  if (e === "unfunded" && s === "pending_acceptance") {
    steps.push({ label: "Awaiting escrow funding", icon: <Lock className="h-3.5 w-3.5 text-gray-400" /> });
    steps.push({ label: "Awaiting freelancer", icon: <UserCheck className="h-3.5 w-3.5 text-gray-400" /> });
    steps.push({ label: "Work submission", icon: <Send className="h-3.5 w-3.5 text-gray-400" /> });
    steps.push({ label: "Delivery confirmed", icon: <CheckCircle className="h-3.5 w-3.5 text-gray-400" /> });
  } else if (e === "funded" && s === "pending_acceptance") {
    steps.push({ label: "Awaiting freelancer", icon: <UserCheck className="h-3.5 w-3.5 text-gray-400" /> });
    steps.push({ label: "Work submission", icon: <Send className="h-3.5 w-3.5 text-gray-400" /> });
    steps.push({ label: "Delivery confirmed", icon: <CheckCircle className="h-3.5 w-3.5 text-gray-400" /> });
  } else if (s === "in_progress" || s === "revision_requested") {
    steps.push({ label: "Work submission", icon: <Send className="h-3.5 w-3.5 text-gray-400" /> });
    steps.push({ label: "Delivery confirmed", icon: <CheckCircle className="h-3.5 w-3.5 text-gray-400" /> });
  } else if (s === "submitted") {
    steps.push({ label: "Delivery confirmed", icon: <CheckCircle className="h-3.5 w-3.5 text-gray-400" /> });
  } else if (s === "disputed") {
    steps.push({ label: "Dispute resolution", icon: <Clock className="h-3.5 w-3.5 text-gray-400" /> });
  }

  return steps;
}

// ── Main Export ──

export function EvidenceTimeline({
  entries,
  deal,
  role,
  guestFreelancerName,
  currentUserId,
  onConfirmDelivery,
  onRequestRevision,
  onOpenDispute,
  actionCard,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  const pendingSteps = getPendingSteps(deal);

  return (
    <div>
      {/* Timeline entries */}
      {entries.length === 0 && !actionCard ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-600">No activity yet.</p>
        </div>
      ) : entries.length === 0 && actionCard ? (
        <div className="relative">
          <div className="mt-2">{actionCard}</div>
          <div ref={bottomRef} />
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 sm:left-5 top-4 bottom-4 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {entries.map((entry, index) => {
              const variant = getNodeVariant(entry, index === 0);

              if (variant === "genesis") {
                return <GenesisNode key={entry.id} deal={deal} entry={entry} />;
              }

              return (
                <TimelineNode
                  key={entry.id}
                  entry={entry}
                  index={index}
                  variant={variant}
                  deal={deal}
                  role={role}
                  guestFreelancerName={guestFreelancerName}
                  currentUserId={currentUserId}
                  onConfirmDelivery={onConfirmDelivery}
                  onRequestRevision={onRequestRevision}
                  onOpenDispute={onOpenDispute}
                />
              );
            })}

            {/* Pending future steps */}
            {pendingSteps.map((step, i) => (
              <PendingNode key={`pending-${i}`} label={step.label} icon={step.icon} />
            ))}

            {/* Action card — contextual next step, injected by parent */}
            {actionCard && (
              <div className="mt-2">{actionCard}</div>
            )}
          </div>

          {/* Action card — contextual next step, injected by parent */}
          {actionCard && (
            <div className="mt-2">{actionCard}</div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Empty timeline but has an action card */}
      {entries.length === 0 && actionCard && (
        <div className="relative">
          <div className="mt-2">{actionCard}</div>
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
