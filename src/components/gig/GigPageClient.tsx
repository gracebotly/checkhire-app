"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  Lock,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert } from "@/components/ui/alert";
import { EscrowStatusBar } from "@/components/gig/EscrowStatusBar";
import { MilestoneTracker } from "@/components/gig/MilestoneTracker";
import { TrustBadge } from "@/components/gig/TrustBadge";
import { ActivityLog } from "@/components/gig/ActivityLog";
import { ActivityInput } from "@/components/gig/ActivityInput";
import { ShareButton } from "@/components/gig/ShareButton";
import { useToast } from "@/components/ui/toast";
import type {
  DealWithParticipants,
  Milestone,
  ActivityLogEntryWithUser,
  DealStatus,
} from "@/types/database";

type Props = {
  deal: DealWithParticipants;
  milestones: Milestone[];
  activity: ActivityLogEntryWithUser[];
  role: "client" | "freelancer" | "visitor";
  currentUserId: string | null;
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

const categoryLabels: Record<string, string> = {
  design: "Design",
  development: "Development",
  writing: "Writing",
  marketing: "Marketing",
  virtual_assistant: "Virtual Assistant",
  other: "Other",
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function GigPageClient({
  deal,
  milestones: initialMilestones,
  activity: initialActivity,
  role,
  currentUserId,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [activityEntries, setActivityEntries] = useState(initialActivity);
  const [escrowExpanded, setEscrowExpanded] = useState(role === "visitor");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const status = statusMap[deal.status] || statusMap.pending_acceptance;
  const dealUrl = typeof window !== "undefined" ? window.location.href : "";
  const isParticipant = role === "client" || role === "freelancer";

  const refreshActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/by-slug/${deal.deal_link_slug}`);
      const data = await res.json();
      if (data.ok && data.activity) {
        setActivityEntries(data.activity);
      }
    } catch {
      // silent
    }
  }, [deal.deal_link_slug]);

  const handleAccept = async () => {
    if (!currentUserId) {
      router.push(`/login?redirect=/deal/${deal.deal_link_slug}`);
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast("Gig accepted!", "success");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast("Gig cancelled", "info");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mx-auto max-w-4xl px-6 py-10 pb-36 md:pb-10"
    >
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {/* 1. Gig Header */}
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold text-slate-900 md:text-2xl">
          {deal.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          {deal.category && (
            <Badge variant="outline">
              {categoryLabels[deal.category]}
            </Badge>
          )}
        </div>
        <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-slate-900">
          ${(deal.total_amount / 100).toFixed(2)}
        </p>
        <div className="mt-1 flex items-center gap-1 text-sm text-slate-600">
          <Calendar className="h-4 w-4" />
          {deal.deadline
            ? new Date(deal.deadline).toLocaleDateString()
            : "No deadline"}
        </div>
      </div>

      {/* 2. Escrow Status Bar */}
      <div className="mb-6">
        <EscrowStatusBar status={deal.escrow_status} amount={deal.total_amount} />
      </div>

      {/* 3. Deal Terms Card */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Description</h3>
          <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">
            {deal.description}
          </p>
        </div>
        <Separator />
        {deal.deliverables && (
          <>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Deliverables
              </h3>
              <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">
                {deal.deliverables}
              </p>
            </div>
            <Separator />
          </>
        )}
        {deal.has_milestones && initialMilestones.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Milestones
            </h3>
            <MilestoneTracker milestones={initialMilestones} />
          </div>
        )}
      </div>

      {/* 4. Participants */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {/* Client */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold text-slate-600">Client</p>
          <div className="flex items-center gap-3">
            {deal.client.avatar_url ? (
              <img
                src={deal.client.avatar_url}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-muted text-sm font-semibold text-brand">
                {getInitials(deal.client.display_name)}
              </div>
            )}
            <div>
              {deal.client.profile_slug ? (
                <a
                  href={`/u/${deal.client.profile_slug}`}
                  className="cursor-pointer text-sm font-semibold text-slate-900 transition-colors duration-200 hover:text-brand"
                >
                  {deal.client.display_name || "Unknown"}
                </a>
              ) : (
                <span className="text-sm font-semibold text-slate-900">
                  {deal.client.display_name || "Unknown"}
                </span>
              )}
              <TrustBadge badge={deal.client.trust_badge} size="sm" />
            </div>
          </div>
        </div>

        {/* Freelancer */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold text-slate-600">
            Freelancer
          </p>
          {deal.freelancer ? (
            <div className="flex items-center gap-3">
              {deal.freelancer.avatar_url ? (
                <img
                  src={deal.freelancer.avatar_url}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-muted text-sm font-semibold text-brand">
                  {getInitials(deal.freelancer.display_name)}
                </div>
              )}
              <div>
                {deal.freelancer.profile_slug ? (
                  <a
                    href={`/u/${deal.freelancer.profile_slug}`}
                    className="cursor-pointer text-sm font-semibold text-slate-900 transition-colors duration-200 hover:text-brand"
                  >
                    {deal.freelancer.display_name || "Unknown"}
                  </a>
                ) : (
                  <span className="text-sm font-semibold text-slate-900">
                    {deal.freelancer.display_name || "Unknown"}
                  </span>
                )}
                <TrustBadge badge={deal.freelancer.trust_badge} size="sm" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Waiting for someone to accept
            </p>
          )}
        </div>
      </div>

      {/* 5. Activity Log */}
      {isParticipant && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Activity
          </h3>
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <ActivityLog entries={activityEntries} />
            <Separator />
            <ActivityInput dealId={deal.id} onNewEntry={refreshActivity} />
          </div>
        </div>
      )}

      {/* 6. How Escrow Protects You */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setEscrowExpanded(!escrowExpanded)}
          className="flex w-full cursor-pointer items-center justify-between p-5 text-left transition-colors duration-200 hover:bg-gray-50/50"
        >
          <span className="text-sm font-semibold text-slate-900">
            How Escrow Protects You
          </span>
          {escrowExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-600" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-600" />
          )}
        </button>
        {escrowExpanded && (
          <div className="border-t border-gray-100 p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-muted">
                  <Lock className="h-5 w-5 text-brand" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  Funds Locked
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Client pays into escrow before work begins.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-muted">
                  <Clock className="h-5 w-5 text-brand" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  72-Hour Review
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Client reviews work. No response? Auto-release.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-muted">
                  <CheckCircle className="h-5 w-5 text-brand" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  Safe Release
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Freelancer gets paid. Zero fees.
                </p>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-slate-600">
              Have a problem? A real human reviews every dispute within 48
              hours.
            </p>
          </div>
        )}
      </div>

      {/* 7. Action Buttons — sticky on mobile */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-gray-200 bg-white px-6 py-3 md:static md:border-0 md:px-0 md:py-0">
        <div className="flex items-center gap-3">
          {/* Always show Copy Link for participants */}
          {isParticipant && (
            <ShareButton url={dealUrl} title={deal.title} />
          )}

          {/* Visitor (unauth) */}
          {role === "visitor" &&
            !currentUserId &&
            deal.status === "pending_acceptance" &&
            !deal.freelancer && (
              <Button onClick={handleAccept} disabled={actionLoading}>
                Accept Gig
              </Button>
            )}

          {/* Visitor (auth, not participant) */}
          {role === "visitor" &&
            currentUserId &&
            deal.status === "pending_acceptance" &&
            !deal.freelancer && (
              <Button onClick={handleAccept} disabled={actionLoading}>
                {actionLoading ? "Accepting..." : "Accept Gig"}
              </Button>
            )}

          {/* Client actions */}
          {role === "client" && deal.status === "pending_acceptance" && (
            <>
              <ShareButton url={dealUrl} title={deal.title} />
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={actionLoading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Cancel Gig
              </Button>
            </>
          )}

          {/* Client funded+ just show share */}
          {role === "client" &&
            deal.status !== "pending_acceptance" &&
            deal.status !== "cancelled" && (
              <ShareButton url={dealUrl} title={deal.title} />
            )}
        </div>
      </div>
    </motion.div>
  );
}
