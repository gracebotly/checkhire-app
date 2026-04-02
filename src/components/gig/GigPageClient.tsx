"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { categoryLabels } from "@/lib/categories";
import {
  Calendar,
  Lock,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  PenLine,
  Ban,
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
import { EvidenceTimeline } from "@/components/gig/EvidenceTimeline";
import { EvidenceUploadCard } from "@/components/gig/EvidenceUploadCard";
import { GuestAcceptCard } from "@/components/gig/GuestAcceptCard";
import { AccountNudgeBanner } from "@/components/gig/AccountNudgeBanner";
import { CancelRefundDialog } from "@/components/gig/CancelRefundDialog";
import { ShareButton } from "@/components/gig/ShareButton";
import { ShareHub } from "@/components/gig/ShareHub";
import { CountdownTimer } from "@/components/gig/CountdownTimer";
import { StripeConnectPrompt } from "@/components/gig/StripeConnectPrompt";
import { InstantPayoutCard } from "@/components/gig/InstantPayoutCard";
import { RatingForm } from "@/components/gig/RatingForm";
import { RatingDisplay } from "@/components/gig/RatingDisplay";
import { StarRating } from "@/components/gig/StarRating";
import { InterestForm } from "@/components/gig/InterestForm";
import { InterestList } from "@/components/gig/InterestList";
import { RepeatDealButton } from "@/components/gig/RepeatDealButton";
import { ReferralPromptCard } from "@/components/gig/ReferralPromptCard";
import { DisputeButton } from "@/components/gig/DisputeButton";
import { ProposalReveal } from "@/components/gig/ProposalReveal";
import { useToast } from "@/components/ui/toast";
import type {
  DealWithParticipants,
  Milestone,
  ActivityLogEntryWithUser,
  DealStatus,
  Rating,
  DealInterest,
  DealInterestWithUser,
  AcceptanceCriteria,
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
  guestFreelancerName?: string | null;
  guestToken?: string | null;
  acceptanceCriteria: AcceptanceCriteria[];
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
  guestFreelancerName = null,
  guestToken: initialGuestToken = null,
  acceptanceCriteria,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [activityEntries, setActivityEntries] = useState(initialActivity);
  const [userRating, setUserRating] = useState(initialUserRating);
  const [otherRating, setOtherRating] = useState(initialOtherRating);
  const [escrowExpanded, setEscrowExpanded] = useState(role === "visitor");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [guestToken, setGuestToken] = useState(initialGuestToken);
  const [termsExpanded, setTermsExpanded] = useState(role === "visitor");

  const [editingSlug, setEditingSlug] = useState(false);
  const [slugInput, setSlugInput] = useState(deal.deal_link_slug);
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugError, setSlugError] = useState("");

  // Dialog states
  const [revisionNotes, setRevisionNotes] = useState("");
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const status = statusMap[deal.status] || statusMap.pending_acceptance;
  const dealUrl = typeof window !== "undefined" ? window.location.href : "";
  const isParticipant = role === "client" || role === "freelancer";
  const isGuestFreelancer = !!guestToken && role === "freelancer";
  const hasFreelancer = !!deal.freelancer_user_id || !!deal.guest_freelancer_email;

  // Grace period: 24 hours from acceptance
  const gracePeriodExpired = (() => {
    if (!deal.accepted_at) return false;
    const acceptedAt = new Date(deal.accepted_at);
    const gracePeriodEnd = new Date(acceptedAt.getTime() + 24 * 60 * 60 * 1000);
    return new Date() > gracePeriodEnd;
  })();

  const gracePeriodRemaining = (() => {
    if (!deal.accepted_at) return null;
    const acceptedAt = new Date(deal.accepted_at);
    const gracePeriodEnd = new Date(acceptedAt.getTime() + 24 * 60 * 60 * 1000);
    const remaining = gracePeriodEnd.getTime() - Date.now();
    if (remaining <= 0) return null;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m left to cancel`;
    return `${minutes}m left to cancel`;
  })();

  const platformFee = Math.round(deal.total_amount * 0.05);
  const subtotalCents = deal.total_amount + platformFee;
  const totalCharge = Math.round((subtotalCents + 30) / (1 - 0.029));
  const stripeFee = totalCharge - subtotalCents;

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
      const url = guestToken
        ? `/api/deals/by-slug/${deal.deal_link_slug}?guest_token=${encodeURIComponent(guestToken)}`
        : `/api/deals/by-slug/${deal.deal_link_slug}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok && data.activity) {
        setActivityEntries(data.activity);
      }
    } catch {
      // silent
    }
  }, [deal.deal_link_slug, guestToken]);

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

  const handleSaveSlug = async () => {
    const cleaned = slugInput.toLowerCase().trim();
    if (cleaned === deal.deal_link_slug) {
      setEditingSlug(false);
      return;
    }
    if (cleaned.length < 3) {
      setSlugError("Minimum 3 characters");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(cleaned)) {
      setSlugError("Lowercase letters, numbers, and hyphens only");
      return;
    }
    setSlugSaving(true);
    setSlugError("");
    try {
      const res = await fetch(`/api/deals/${deal.id}/slug`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: cleaned }),
      });
      const data = await res.json();
      if (!data.ok) {
        setSlugError(data.message || "Failed to update link");
        return;
      }
      setEditingSlug(false);
      window.history.replaceState(null, "", `/deal/${cleaned}`);
      router.refresh();
    } catch {
      setSlugError("Something went wrong");
    } finally {
      setSlugSaving(false);
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
      {/* Rejected deal — visitor view */}
      {deal.review_status === "rejected" && !isParticipant && (
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <Ban className="mx-auto h-10 w-10 text-slate-600 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 font-display">
            This gig is no longer available
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            This gig was removed by CheckHire for not meeting our safety standards.
          </p>
        </div>
      )}

      {!(deal.review_status === "rejected" && !isParticipant) && (
        <>
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
          {deal.payment_frequency && deal.payment_frequency !== "one_time" && (
            <Badge variant="outline">
              {deal.payment_frequency === "weekly" ? "Paid Weekly" : deal.payment_frequency === "biweekly" ? "Paid Biweekly" : "Paid Monthly"}
            </Badge>
          )}
        </div>
        <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-slate-900">
          ${(deal.total_amount / 100).toFixed(2)}
        </p>
        {deal.deadline && (
          <div className="mt-1 flex items-center gap-1 text-sm text-slate-600">
            <Calendar className="h-4 w-4" />
            Due {new Date(deal.deadline).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* 2. Escrow Status Bar */}
      <div className="mb-6">
        <EscrowStatusBar status={deal.escrow_status} amount={deal.total_amount} />
      </div>

      {/* Stripe Connect / Fund Escrow prompt for clients */}
      {role === "client" && deal.escrow_status === "unfunded" && deal.status !== "cancelled" && (
        <div className="mb-6">
          <StripeConnectPrompt
            dealId={deal.id}
            dealSlug={deal.deal_link_slug}
            totalAmountCents={deal.total_amount}
            hasMilestones={deal.has_milestones}
            stripeConnected={true}
            escrowStatus={deal.escrow_status}
          />
        </div>
      )}

      {/* 2a. Moderation Banners — only shown when deal is NOT approved */}
      {deal.review_status === "pending" && isParticipant && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Your gig is being verified by CheckHire
              </p>
              <p className="mt-1 text-sm text-amber-700">
                {role === "client"
                  ? "Funds are secured. Payouts will be enabled once verification is complete. This usually takes less than 24 hours."
                  : "Your payment is secured. Payouts will be enabled once CheckHire completes verification."}
              </p>
            </div>
          </div>
        </div>
      )}

      {deal.review_status === "changes_requested" && isParticipant && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <PenLine className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                CheckHire has requested changes to this gig
              </p>
              {deal.review_notes && (
                <p className="mt-1 text-sm text-blue-700">
                  {deal.review_notes}
                </p>
              )}
              {role === "client" && (
                <p className="mt-2 text-sm text-blue-700">
                  Please update your gig to address the feedback above. Payouts are paused until changes are reviewed.
                </p>
              )}
              {role === "freelancer" && (
                <p className="mt-2 text-sm text-blue-700">
                  The client has been asked to make changes. Your payment is still secured in escrow.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {deal.review_status === "rejected" && isParticipant && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <Ban className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-900">
                This gig has been removed by CheckHire
              </p>
              {deal.review_notes && (
                <p className="mt-1 text-sm text-red-700">
                  Reason: {deal.review_notes}
                </p>
              )}
              {role === "client" && deal.escrow_status === "frozen" && (
                <p className="mt-2 text-sm text-red-700">
                  Your payment is being refunded to your original payment method. This may take 5-10 business days.
                </p>
              )}
              {role === "freelancer" && (
                <p className="mt-2 text-sm text-red-700">
                  No funds were released. If you believe this is an error, please contact support@checkhire.co.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* 3. Agreement Details — open for visitors, collapsible for participants */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white">
        {role === "visitor" ? (
          <div className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Project Details</h3>
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
        ) : (
          <>
            <button
              type="button"
              onClick={() => setTermsExpanded(!termsExpanded)}
              className="flex w-full cursor-pointer items-center justify-between p-5 text-left transition-colors duration-200 hover:bg-gray-50/50"
            >
              <span className="text-sm font-semibold text-slate-900">
                Agreement Details
              </span>
              {termsExpanded ? (
                <ChevronUp className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              )}
            </button>
            {termsExpanded && (
              <div className="border-t border-gray-100 p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Project Details</h3>
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
            )}
          </>
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

      {/* Referral prompt for freelancers on completed deals */}
      {role === "freelancer" && deal.status === "completed" && currentUserId && (
        <div className="mb-6">
          <ReferralPromptCard amountCents={deal.total_amount} />
        </div>
      )}

      {/* 4b. Guest Accept Card */}
      {role === "visitor" &&
        !currentUserId &&
        deal.status === "pending_acceptance" &&
        !hasFreelancer && (
          <div className="mb-6">
            <GuestAcceptCard
              dealId={deal.id}
              dealSlug={deal.deal_link_slug}
              escrowFunded={deal.escrow_status === "funded"}
              amountCents={deal.total_amount}
              onAccepted={(token) => {
                setGuestToken(token);
                refreshActivity();
                router.refresh();
              }}
            />
          </div>
        )}

      {/* ShareHub — for client on pending/funded deals */}
      {role === "client" &&
        (deal.status === "pending_acceptance" || deal.status === "funded") && (
          <div className="mb-6 space-y-3">
            <ShareHub
              dealSlug={deal.deal_link_slug}
              dealTitle={deal.title}
              amountCents={deal.total_amount}
              deadline={deal.deadline}
              category={deal.category}
              description={deal.description}
              clientName={deal.client.display_name || "Client"}
              escrowFunded={deal.escrow_status === "funded"}
            />
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              {editingSlug && role === "client" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs text-slate-600">checkhire.co/deal/</span>
                    <input
                      type="text"
                      value={slugInput}
                      onChange={(e) => {
                        setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                        setSlugError("");
                      }}
                      className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-brand"
                      maxLength={60}
                    />
                  </div>
                  {slugError && (
                    <p className="text-xs text-red-600">{slugError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveSlug}
                      disabled={slugSaving}
                    >
                      {slugSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingSlug(false);
                        setSlugInput(deal.deal_link_slug);
                        setSlugError("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs text-slate-600">
                    checkhire.co/deal/{deal.deal_link_slug}
                  </p>
                  {role === "client" && (
                    <button
                      type="button"
                      onClick={() => setEditingSlug(true)}
                      className="cursor-pointer text-xs text-brand transition-colors duration-200 hover:text-brand-hover"
                    >
                      Customize
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      {/* Collapsed share link for active deals with freelancer */}
      {role === "client" &&
        hasFreelancer &&
        !["pending_acceptance", "funded", "cancelled", "refunded", "completed"].includes(deal.status) && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex-1 select-all font-mono text-sm text-slate-600">
              checkhire.co/deal/{deal.deal_link_slug}
            </div>
            <ShareButton url={dealUrl} title={deal.title} />
          </div>
        )}

      {/* 5. Evidence Timeline */}
      {(isParticipant || guestToken) && (
        <div className="mb-6">
          <EvidenceTimeline
            entries={activityEntries}
            deal={deal}
            role={guestToken ? "freelancer" : role}
            guestFreelancerName={guestFreelancerName || deal.guest_freelancer_name || null}
            currentUserId={currentUserId}
            onConfirmDelivery={() => setConfirmDialogOpen(true)}
            onRequestRevision={() => {
              setRevisionNotes("");
              setRevisionDialogOpen(true);
            }}
            onOpenDispute={() => {}}
          />
        </div>
      )}

      {/* Dispute Proposals */}
      {deal.status === "disputed" && disputeId && (
        <div className="mb-6">
          <ProposalReveal
            totalAmountCents={deal.total_amount}
            claimantPercentage={null}
            respondentPercentage={null}
            claimantName="Claimant"
            respondentName="Respondent"
            isResolved={false}
            negotiationRound={0}
          />
        </div>
      )}

      {/* Acceptance Criteria Checklist */}
      {acceptanceCriteria.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Completion requirements
          </h3>
          <div className="space-y-2">
            {acceptanceCriteria.map((criteria) => {
              const isFulfilled = activityEntries.some(
                (a) => a.criteria_id === criteria.id && a.is_submission_evidence
              );
              return (
                <div
                  key={criteria.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    isFulfilled
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    isFulfilled ? "bg-green-600" : "bg-gray-200"
                  }`}>
                    {isFulfilled && (
                      <CheckCircle className="h-3.5 w-3.5 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
                        {criteria.evidence_type === "file"
                          ? "File"
                          : criteria.evidence_type === "screenshot"
                          ? "Screenshot"
                          : criteria.evidence_type === "link"
                          ? "Link"
                          : criteria.evidence_type === "video"
                          ? "Video"
                          : "Text"}
                      </span>
                      <span className={`text-sm ${isFulfilled ? "text-green-900" : "text-slate-900"}`}>
                        {criteria.description}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Evidence Upload — for freelancers and guest freelancers */}
      {(role === "freelancer" || guestToken) &&
        deal.status !== "completed" &&
        deal.status !== "cancelled" &&
        deal.status !== "refunded" && (
        <div className="mb-6">
          <EvidenceUploadCard
            dealId={deal.id}
            guestToken={guestToken}
            onUploaded={refreshActivity}
            dealStatus={deal.status}
          />
        </div>
      )}

      {/* 5c. Account Nudge Banner — for guest freelancers */}
      {isGuestFreelancer && (
        <div className="mb-6">
          <AccountNudgeBanner />
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(dealUrl);
                toast("Link copied!", "success");
              }}
              className="cursor-pointer"
            >
              Copy Link
            </Button>
          )}

          {/* ── Visitor actions ── */}
          {role === "visitor" &&
            deal.status === "pending_acceptance" &&
            !deal.freelancer && (
              <>
                {deal.escrow_status === "funded" ? (
                  <Button onClick={handleAccept} disabled={actionLoading}>
                    {actionLoading ? "Accepting..." : "Accept Gig"}
                  </Button>
                ) : (
                  <p className="text-sm text-slate-600">
                    Escrow is not yet funded. Express interest below or message the client directly.
                  </p>
                )}
              </>
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
                      ${(platformFee / 100).toFixed(2)} platform fee (5%) + ${(stripeFee / 100).toFixed(2)} processing
                    </p>
                  </div>
                )}

              {/* Funded — cancel & refund (with grace period check) */}
              {deal.status === "funded" &&
                deal.escrow_status === "funded" && (
                  <>
                    {hasFreelancer && gracePeriodExpired ? (
                      <div className="rounded-lg bg-slate-50 border border-gray-200 p-3">
                        <p className="text-xs text-slate-600">
                          Escrow is locked — the freelancer accepted more than 24 hours ago.
                          If there&apos;s a problem, <a href={`/deal/${deal.deal_link_slug}/dispute`} className="text-brand underline cursor-pointer">open a dispute</a>.
                        </p>
                      </div>
                    ) : (
                      <>
                        <CancelRefundDialog
                          dealId={deal.id}
                          dealTitle={deal.title}
                          refundAmountCents={deal.total_amount}
                          hasFreelancer={hasFreelancer}
                          onSuccess={() => {
                            toast("Gig cancelled — refund issued", "info");
                            router.refresh();
                          }}
                        >
                          <Button
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Cancel & Refund
                          </Button>
                        </CancelRefundDialog>
                        {hasFreelancer && gracePeriodRemaining && (
                          <p className="text-xs text-slate-600 mt-1">
                            {gracePeriodRemaining}
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}

              {/* Work submitted — confirm or revise */}
              {deal.status === "submitted" && deal.review_status === "approved" && !deal.has_milestones && (
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
            totalAmountCents={deal.total_amount}
            guestToken={guestToken}
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
        </>
      )}
    </motion.div>
  );
}
