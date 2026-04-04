"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Calendar, CircleDashed, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TrustBadge } from "@/components/gig/TrustBadge";
import { categoryLabels } from "@/lib/categories";
import type { DealWithParticipants, DealStatus, EscrowStatus } from "@/types/database";

type Props = {
  deal: DealWithParticipants;
  index: number;
  currentUserId: string;
};

const statusMap: Record<
  DealStatus,
  { label: string; variant: "warning" | "success" | "default" | "danger" | "outline" }
> = {
  draft: { label: "Draft", variant: "outline" },
  pending_acceptance: { label: "Awaiting Acceptance", variant: "warning" },
  funded: { label: "Payment Secured", variant: "success" },
  in_progress: { label: "In Progress", variant: "default" },
  submitted: { label: "Work Submitted", variant: "warning" },
  revision_requested: { label: "Revision Requested", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  disputed: { label: "Disputed", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "outline" },
  refunded: { label: "Refunded", variant: "outline" },
};

function getEscrowBadge(
  escrowStatus: EscrowStatus,
  dealStatus: DealStatus
): {
  label: string;
  icon: "lock" | "dashed" | null;
  variant: "success" | "outline";
} | null {
  if (["completed", "cancelled", "refunded"].includes(dealStatus)) return null;
  if (escrowStatus === "fully_released") return null;

  if (escrowStatus === "funded" || escrowStatus === "partially_released") {
    return { label: "Payment Secured", icon: "lock", variant: "success" };
  }
  if (escrowStatus === "frozen") {
    return { label: "Funds Frozen", icon: "lock", variant: "outline" };
  }
  if (escrowStatus === "unfunded") {
    return { label: "Not Funded", icon: "dashed", variant: "outline" };
  }
  return null;
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

export function GigCard({ deal, index, currentUserId }: Props) {
  const status = statusMap[deal.status] || statusMap.pending_acceptance;
  const escrowBadge = getEscrowBadge(deal.escrow_status, deal.status);
  const isClient = deal.client_user_id === currentUserId;
  const otherParty = isClient ? deal.freelancer : deal.client;
  const otherPartyLabel = isClient ? "Freelancer" : "Client";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
    >
      <Link href={deal.status === "draft" ? `/deal/new?draft=${deal.id}` : `/deal/${deal.deal_link_slug}`}>
        <div className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50/50">
          {/* Row 1: Title + Status badges */}
          <div className="flex items-center justify-between gap-3">
            <h3 className="min-w-0 truncate text-sm font-semibold text-slate-900">
              {deal.title}
            </h3>
            <div className="flex shrink-0 items-center gap-1.5">
              {escrowBadge && (
                <Badge variant={escrowBadge.variant}>
                  {escrowBadge.icon === "lock" && (
                    <Lock className="mr-1 h-3 w-3" />
                  )}
                  {escrowBadge.icon === "dashed" && (
                    <CircleDashed className="mr-1 h-3 w-3" />
                  )}
                  {escrowBadge.label}
                </Badge>
              )}
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
          </div>

          {/* Row 2: Amount + Category + Other party + Deadline + Time — all on one line */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
              ${(deal.total_amount / 100).toFixed(2)}
            </span>
            {deal.category && (
              <span>{categoryLabels[deal.category]}</span>
            )}
            {otherParty ? (
              <span className="flex items-center gap-1">
                {otherPartyLabel}: {otherParty.display_name || "Unknown"}
                <TrustBadge badge={otherParty.trust_badge} size="sm" />
              </span>
            ) : (
              <span>Waiting for applicants</span>
            )}
            {deal.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(deal.deadline).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            <span>{formatRelativeTime(deal.updated_at)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
