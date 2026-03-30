"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  Lock,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import { EscrowStatusBar } from "@/components/gig/EscrowStatusBar";
import { MilestoneTracker } from "@/components/gig/MilestoneTracker";
import { TrustBadge } from "@/components/gig/TrustBadge";
import { ActivityLog } from "@/components/gig/ActivityLog";
import { ActivityInput } from "@/components/gig/ActivityInput";
import { ShareButton } from "@/components/gig/ShareButton";
import { CountdownTimer } from "@/components/gig/CountdownTimer";
import { StripeConnectPrompt } from "@/components/gig/StripeConnectPrompt";
import { InstantPayoutCard } from "@/components/gig/InstantPayoutCard";
import { RatingForm } from "@/components/gig/RatingForm";
import { RatingDisplay } from "@/components/gig/RatingDisplay";
import { StarRating } from "@/components/gig/StarRating";
import { InterestForm } from "@/components/gig/InterestForm";
import { InterestList } from "@/components/gig/InterestList";
import { RepeatDealButton } from "@/components/gig/RepeatDealButton";
import { DisputeButton } from "@/components/gig/DisputeButton";
import { useToast } from "@/components/ui/toast";
import type {
  DealWithParticipants,
  Milestone,
  ActivityLogEntryWithUser,
  DealStatus,
  Rating,
  DealInterest,
  DealInterestWithUser,
} from "@/types/database";

type Props = {
  deal: DealWithParticipants;
  milestones: Milestone[];
  activity: ActivityLogEntryWithUser[];
  role: "client" | "freelancer" | "visitor";
  currentUserId: string | null;
  fundedStatus: string | null;
  userRating: Rating | null;
  otherRating: Rating | null;
  interests: DealInterestWithUser[];
  userInterest: DealInterest | null;
  disputeId: string | null;
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
  fundedStatus,
  userRating: initialUserRating,
  otherRating: initialOtherRating,
  interests,
  userInterest,
  disputeId,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [activityEntries, setActivityEntries] = useState(initialActivity);
  const [userRating, setUserRating] = useState(initialUserRating);
  const [otherRating, setOtherRating] = useState(initialOtherRating);
  const [escrowExpanded, setEscrowExpanded] = useState(role === "visitor");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Dialog states
  const [revisionNotes, setRevisionNotes] = useState("");
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const status = statusMap[deal.status] || statusMap.pending_acceptance;
  const dealUrl = typeof window !== "undefined" ? window.location.href : "";
  const isParticipant = role === "client" || role === "freelancer";

  const platformFee = Math.round(deal.total_amount * 0.05);
  const totalCharge = deal.total_amount + platformFee;

  // Handle ?funded=true/cancelled query param
  useEffect(() => {
    if (fundedStatus === "true") {
      toast("Payment secured! The freelancer can start work.", "success");
      window.history.replaceState(null, "", `/deal/${deal.deal_link_slug}`);
    } else if (fundedStatus === "cancelled") {
      toast("Checkout cancelled — escrow not funded.", "info");
      window.history.replaceState(null, "", `/deal/${deal.deal_link_slug}`);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Existing handlers ──

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

  // ── New handlers ──

  const handleFundEscrow = async (milestoneId?: string, fundAll?: boolean) => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_id: deal.id,
          milestone_id: milestoneId,
          fund_all: fundAll,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setActionLoading(false);
    }
  };

  const handleSubmitWork = async (milestoneId?: string) => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/deals/${deal.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_id: milestoneId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast("Work submitted! The client has 72 hours to review.", "success");
      setSubmitDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelivery = async (milestoneId?: string) => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/deals/${deal.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_id: milestoneId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast("Delivery confirmed! Payment released.", "success");
      setConfirmDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestRevision = async (milestoneId?: string) => {
    if (!revisionNotes.trim()) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/deals/${deal.id}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: revisionNotes.trim(), milestone_id: milestoneId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast("Revision requested", "info");
      setRevisionNotes("");
      setRevisionDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request revision");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelWithRefund = async () => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/deals/${deal.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast(
        deal.escrow_status === "funded"
          ? "Gig cancelled — refund issued"
          : "Gig cancelled",
        "info"
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStripeConnect = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      if (data.already_connected) {
        toast("Stripe already connected!", "success");
        setActionLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect Stripe");
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

      {/* 2b. Dispute Banner */}
      {deal.status === "disputed" && isParticipant && disputeId && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-900">
                This gig is under dispute. Funds are frozen.
              </p>
              <a
                href={`/deal/${deal.id}/dispute`}
                className="mt-1 inline-block text-sm font-medium text-red-700 underline underline-offset-2 transition-colors duration-200 hover:text-red-900"
              >
                View Dispute &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 2c. 72-Hour Countdown */}
      {deal.auto_release_at &&
        new Date(deal.auto_release_at) > new Date() &&
        isParticipant && (
          <div className="mb-6">
            <CountdownTimer
              autoReleaseAt={deal.auto_release_at}
              role={role === "client" ? "client" : "freelancer"}
              onExpired={() => router.refresh()}
            />
          </div>
        )}

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
            <MilestoneTracker
              milestones={initialMilestones}
              dealId={deal.id}
              role={role}
              onAction={() => router.refresh()}
            />
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

      {/* Interest Section for Public Deals */}
      {deal.deal_type === "public" && (
        <div className="mb-6">
          {/* Client sees interest list */}
          {role === "client" && (
            <InterestList dealId={deal.id} interests={interests} />
          )}

          {/* Visitor (authenticated, not client) sees interest form */}
          {role === "visitor" &&
            currentUserId &&
            deal.status === "pending_acceptance" &&
            !deal.freelancer_user_id && (
              <InterestForm
                dealId={deal.id}
                existingInterest={userInterest}
                onSubmitted={() => router.refresh()}
              />
            )}
        </div>
      )}

      {/* Stripe Connect Prompt for freelancers */}
      {role === "freelancer" &&
        deal.freelancer?.stripe_onboarding_complete === false &&
        deal.escrow_status !== "unfunded" && (
          <div className="mb-6">
            <StripeConnectPrompt
              onConnect={handleStripeConnect}
              loading={actionLoading}
            />
          </div>
        )}

      {/* Instant Payout for completed deals */}
      {role === "freelancer" && deal.status === "completed" && (
        <div className="mb-6">
          <InstantPayoutCard amount={deal.total_amount} dealId={deal.id} />
        </div>
      )}

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

      {/* Rating Section */}
      {deal.status === "completed" && isParticipant && (
        <div className="mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Ratings</h3>

          {/* Show RatingForm if user hasn't rated yet */}
          {!userRating && (
            <RatingForm
              dealId={deal.id}
              onRated={() => router.refresh()}
            />
          )}

          {/* Show user's submitted rating */}
          {userRating && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="mb-2 text-xs font-semibold text-slate-600">
                Your rating
              </p>
              <div className="flex items-center gap-2">
                <StarRating rating={userRating.stars} size="md" />
                <span className="text-sm font-semibold text-slate-900">
                  {userRating.stars}/5
                </span>
              </div>
              {userRating.comment && (
                <p className="mt-2 text-sm text-slate-600">
                  {userRating.comment}
                </p>
              )}
            </div>
          )}

          {/* Show other party's rating ONLY if user has already rated (prevents peeking) */}
          {userRating && otherRating && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="mb-2 text-xs font-semibold text-slate-600">
                {role === "client" ? "Freelancer's" : "Client's"} rating
              </p>
              <div className="flex items-center gap-2">
                <StarRating rating={otherRating.stars} size="md" />
                <span className="text-sm font-semibold text-slate-900">
                  {otherRating.stars}/5
                </span>
              </div>
              {otherRating.comment && (
                <p className="mt-2 text-sm text-slate-600">
                  {otherRating.comment}
                </p>
              )}
            </div>
          )}

          {/* Waiting state: user rated but other party hasn't yet */}
          {userRating && !otherRating && (
            <p className="text-xs text-slate-600">
              Waiting for the other party to leave their rating...
            </p>
          )}
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
        <div className="flex flex-wrap items-center gap-3">
          {/* Always show Copy Link for participants */}
          {isParticipant && (
            <ShareButton url={dealUrl} title={deal.title} />
          )}

          {/* ── Visitor actions ── */}
          {role === "visitor" &&
            deal.status === "pending_acceptance" &&
            !deal.freelancer && (
              <Button onClick={handleAccept} disabled={actionLoading}>
                {actionLoading ? "Accepting..." : "Accept Gig"}
              </Button>
            )}

          {/* ── Client actions ── */}
          {role === "client" && (
            <>
              {/* Pending acceptance — cancel */}
              {deal.status === "pending_acceptance" &&
                deal.escrow_status === "unfunded" && (
                  <Button
                    variant="ghost"
                    onClick={handleCancelWithRefund}
                    disabled={actionLoading}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Cancel Gig
                  </Button>
                )}

              {/* Freelancer assigned, unfunded — fund escrow */}
              {deal.freelancer_user_id &&
                deal.escrow_status === "unfunded" &&
                deal.status !== "cancelled" &&
                !deal.has_milestones && (
                  <div>
                    <Button
                      onClick={() => handleFundEscrow()}
                      disabled={actionLoading}
                    >
                      <DollarSign className="mr-1 h-4 w-4" />
                      {actionLoading
                        ? "Redirecting..."
                        : `Fund Escrow — $${(totalCharge / 100).toFixed(2)}`}
                    </Button>
                    <p className="mt-1 text-xs text-slate-600">
                      ${(deal.total_amount / 100).toFixed(2)} +{" "}
                      ${(platformFee / 100).toFixed(2)} platform fee (5%)
                    </p>
                  </div>
                )}

              {/* Funded but no work started — cancel & refund */}
              {deal.status === "funded" &&
                deal.escrow_status === "funded" && (
                  <Button
                    variant="ghost"
                    onClick={handleCancelWithRefund}
                    disabled={actionLoading}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Cancel & Refund
                  </Button>
                )}

              {/* Work submitted — confirm or revise */}
              {deal.status === "submitted" && !deal.has_milestones && (
                <>
                  <Button
                    onClick={() => setConfirmDialogOpen(true)}
                    disabled={actionLoading}
                  >
                    Confirm & Release ${(deal.total_amount / 100).toFixed(2)}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRevisionNotes("");
                      setRevisionDialogOpen(true);
                    }}
                    disabled={actionLoading || deal.revision_count >= 3}
                    title={
                      deal.revision_count >= 3
                        ? "Maximum revisions reached"
                        : undefined
                    }
                  >
                    Request Revision ({deal.revision_count}/3)
                  </Button>
                </>
              )}

              {/* Revision requested — waiting */}
              {deal.status === "revision_requested" && (
                <p className="text-sm text-slate-600">
                  Waiting for revised work...
                </p>
              )}

              {/* In progress — waiting */}
              {deal.status === "in_progress" && (
                <p className="text-sm text-slate-600">
                  Waiting for delivery...
                </p>
              )}

              {/* Completed */}
              {deal.status === "completed" && (
                <Badge variant="success">Gig Complete</Badge>
              )}
            </>
          )}

          {/* ── Freelancer actions ── */}
          {role === "freelancer" && (
            <>
              {/* Unfunded — waiting for client */}
              {deal.escrow_status === "unfunded" &&
                deal.freelancer_user_id && (
                  <p className="text-sm text-slate-600">
                    Waiting for client to fund escrow...
                  </p>
                )}

              {/* Work can be submitted (non-milestone deals only) */}
              {!deal.has_milestones &&
                ["in_progress", "funded", "revision_requested"].includes(
                  deal.status
                ) && (
                  <Button
                    onClick={() => setSubmitDialogOpen(true)}
                    disabled={actionLoading}
                  >
                    Mark Work Complete
                  </Button>
                )}

              {/* Work submitted — awaiting review */}
              {deal.status === "submitted" && (
                <p className="text-sm text-slate-600">
                  Work Submitted — Awaiting Review
                </p>
              )}

              {/* Completed */}
              {deal.status === "completed" && (
                <Badge variant="success">Gig Complete</Badge>
              )}
            </>
          )}
        </div>

        {/* Dispute */}
        {isParticipant && (
          <DisputeButton
            dealId={deal.id}
            dealStatus={deal.status}
            completedAt={deal.completed_at}
          />
        )}

        {/* Repeat Deal button for completed deals */}
        {deal.status === "completed" && isParticipant && (
          <RepeatDealButton
            dealId={deal.id}
            otherPartyName={
              role === "client"
                ? deal.freelancer?.display_name || "freelancer"
                : deal.client.display_name || "client"
            }
          />
        )}
      </div>

      {/* ── Dialogs ── */}

      {/* Submit Work Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader
            title="Submit Work for Review"
            description="The client will have 72 hours to review your work. If they don't respond, funds will auto-release to you."
          />
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => handleSubmitWork()}
              disabled={actionLoading}
            >
              {actionLoading ? "Submitting..." : "Submit Work"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delivery Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader
            title="Confirm Delivery"
            description={`Release $${(deal.total_amount / 100).toFixed(2)} to the freelancer? This cannot be undone.`}
          />
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => handleConfirmDelivery()}
              disabled={actionLoading}
            >
              {actionLoading
                ? "Releasing..."
                : `Release $${(deal.total_amount / 100).toFixed(2)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Revision Dialog */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent>
          <DialogHeader
            title="Request Revision"
            description={`Revision ${deal.revision_count + 1} of 3. The 72-hour countdown will pause until the freelancer resubmits.`}
          />
          <textarea
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            placeholder="Describe what needs to change..."
            maxLength={1000}
            rows={4}
            className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-brand resize-none"
          />
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => handleRequestRevision()}
              disabled={actionLoading || !revisionNotes.trim()}
            >
              {actionLoading ? "Requesting..." : "Request Revision"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
