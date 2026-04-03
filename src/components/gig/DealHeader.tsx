"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Calendar, Copy, Check as CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TrustBadge } from "@/components/gig/TrustBadge";
import { categoryLabels } from "@/lib/categories";
import type { DealWithParticipants, DealStatus } from "@/types/database";

type Props = {
  deal: DealWithParticipants;
  role: "client" | "freelancer" | "visitor";
  dealUrl: string;
  isParticipant: boolean;
};

const statusMap: Record<DealStatus, { label: string; variant: "warning" | "success" | "default" | "danger" | "outline" }> = {
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

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function DealHeader({ deal, role, dealUrl, isParticipant }: Props) {
  const status = statusMap[deal.status] || statusMap.pending_acceptance;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(dealUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg font-bold text-slate-900 md:text-xl">{deal.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant={status.variant}>{status.label}</Badge>
            {deal.category && <Badge variant="outline">{categoryLabels[deal.category]}</Badge>}
            {deal.payment_frequency && deal.payment_frequency !== "one_time" && (
              <Badge variant="outline">{deal.payment_frequency === "weekly" ? "Weekly" : deal.payment_frequency === "biweekly" ? "Biweekly" : "Monthly"}</Badge>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-xl font-semibold tabular-nums text-slate-900 md:text-2xl">${(deal.total_amount / 100).toFixed(2)}</p>
          {isParticipant && (
            <button type="button" onClick={handleCopy} className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs text-slate-600 transition-colors duration-200 hover:text-slate-900">
              {copied ? (<><CheckIcon className="h-3 w-3 text-green-600" /><span className="text-green-600">Copied</span></>) : (<><Copy className="h-3 w-3" /><span>Copy link</span></>)}
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3">
        {deal.deadline && (
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Calendar className="h-3.5 w-3.5" />
            Due {new Date(deal.deadline).toLocaleDateString()}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          {deal.client.avatar_url ? (
            <img src={deal.client.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-muted text-[9px] font-semibold text-brand">{getInitials(deal.client.display_name)}</div>
          )}
          <span className="font-medium text-slate-900">{deal.client.display_name || "Client"}</span>
          <TrustBadge badge={deal.client.trust_badge} size="sm" />
          <span className="text-slate-600">→</span>
          {deal.freelancer ? (
            <>
              {deal.freelancer.avatar_url ? (
                <img src={deal.freelancer.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-muted text-[9px] font-semibold text-brand">{getInitials(deal.freelancer.display_name)}</div>
              )}
              <span className="font-medium text-slate-900">{deal.freelancer.display_name || "Freelancer"}</span>
              <TrustBadge badge={deal.freelancer.trust_badge} size="sm" />
            </>
          ) : deal.guest_freelancer_name ? (
            <span className="font-medium text-slate-900">{deal.guest_freelancer_name}</span>
          ) : (
            <span className="italic text-slate-600">Awaiting freelancer</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
