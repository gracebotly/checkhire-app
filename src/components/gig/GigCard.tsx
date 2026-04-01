"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TrustBadge } from "@/components/gig/TrustBadge";
import { categoryLabels } from "@/lib/categories";
import type { DealWithParticipants, DealStatus } from "@/types/database";

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
  const isClient = deal.client_user_id === currentUserId;
  const otherParty = isClient ? deal.freelancer : deal.client;
  const otherPartyLabel = isClient ? "Freelancer" : "Client";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
    >
      <Link href={`/deal/${deal.deal_link_slug}`}>
        <div className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50/50">
          {/* Row 1: Title + Status */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">
              {deal.title}
            </h3>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          {/* Row 2: Amount + Category */}
          <div className="mt-2 flex items-center gap-3">
            <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
              ${(deal.total_amount / 100).toFixed(2)}
            </span>
            {deal.category && (
              <Badge variant="outline">{categoryLabels[deal.category]}</Badge>
            )}
          </div>

          {/* Row 3: Other party */}
          <div className="mt-2 flex items-center gap-2">
            {otherParty ? (
              <>
                <span className="text-sm text-slate-600">
                  {otherPartyLabel}: {otherParty.display_name || "Unknown"}
                </span>
                <TrustBadge badge={otherParty.trust_badge} size="sm" />
              </>
            ) : (
              <span className="text-sm text-slate-600">
                Waiting for someone to accept
              </span>
            )}
          </div>

          {/* Row 4: Deadline + Updated */}
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
            {deal.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(deal.deadline).toLocaleDateString()}
              </span>
            )}
            <span>{formatRelativeTime(deal.updated_at)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
