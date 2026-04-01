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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/gig/CountdownTimer";
import type {
  ActivityLogEntryWithUser,
  DealWithParticipants,
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
};

function getNodeVariant(entry: ActivityLogEntryWithUser): TimelineNodeVariant {
  if (entry.entry_type === "file" && entry.is_submission_evidence) return "evidence";
  if (entry.entry_type === "file") return "message";
  if (entry.entry_type === "text") return "message";

  if (entry.entry_type === "system" && entry.content) {
    const c = entry.content.toLowerCase();
    if (c.includes("escrow funded") || c.includes("payment secured") || c.includes("milestone") && c.includes("funded"))
      return "payment";
    if (c.includes("submitted") || c.includes("mark") && c.includes("complete"))
      return "submission";
    if (c.includes("confirmed") || c.includes("released") || c.includes("auto-released") || c.includes("complete"))
      return "resolution";
    if (c.includes("dispute")) return "dispute";
    if (c.includes("cancelled") || c.includes("refund")) return "resolution";
  }

  return "system";
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(name: string): boolean {
  return /\.(png|jpg|jpeg|gif|webp)$/i.test(name);
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function NodeIcon({ variant }: { variant: TimelineNodeVariant }) {
  switch (variant) {
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
    default:
      return (
        <div className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <Bot className="h-3.5 w-3.5 text-slate-600" />
        </div>
      );
  }
}

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
  const isUserEntry = entry.user_id && entry.user_id === currentUserId;
  const isClientEntry = entry.user_id === deal.client_user_id;

  // Determine if this is a resolution that's positive (confirmed/released) or negative (cancelled/refunded)
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
        {/* System node — minimal */}
        {variant === "system" && (
          <div>
            <p className="text-sm text-slate-600">{entry.content}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {formatRelativeTime(entry.created_at)}
            </p>
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
            <p className="text-xs text-slate-600 mt-2">
              {formatRelativeTime(entry.created_at)}
            </p>
          </div>
        )}

        {/* Evidence node */}
        {variant === "evidence" && (
          <div className="border-l-2 border-green-400 rounded-xl border border-gray-200 bg-white p-4 ml-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="success">Evidence</Badge>
              <span className="text-xs text-slate-600">
                {formatRelativeTime(entry.created_at)}
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
                {formatRelativeTime(entry.created_at)}
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
            <p className="text-xs text-slate-600 mt-2">
              {formatRelativeTime(entry.created_at)}
            </p>
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
            <p className="text-xs text-slate-600 mt-2">
              {formatRelativeTime(entry.created_at)}
            </p>
          </div>
        )}

        {/* Resolution node — neutral (cancelled/refunded) */}
        {variant === "resolution" && !isPositiveResolution && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-slate-600" />
              <p className="text-sm text-slate-900">{entry.content}</p>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {formatRelativeTime(entry.created_at)}
            </p>
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
            <p className="text-xs text-slate-600 mt-2">
              {formatRelativeTime(entry.created_at)}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function EvidenceTimeline({
  entries,
  deal,
  role,
  guestFreelancerName,
  currentUserId,
  onConfirmDelivery,
  onRequestRevision,
  onOpenDispute,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-600">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 sm:left-5 top-4 bottom-4 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {entries.map((entry, index) => {
          const variant = getNodeVariant(entry);
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
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
