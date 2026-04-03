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
  CreditCard,
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
import { MilestoneTracker } from "@/components/gig/MilestoneTracker";
import { TrustBadge } from "@/components/gig/TrustBadge";
import { EvidenceTimeline } from "@/components/gig/EvidenceTimeline";
import { DealStepIndicator } from "@/components/gig/DealStepIndicator";
import { DealHeader } from "@/components/gig/DealHeader";
import { TimelineActionCard } from "@/components/gig/TimelineActionCard";
import { EvidenceUploadCard } from "@/components/gig/EvidenceUploadCard";
import { GuestAcceptCard } from "@/components/gig/GuestAcceptCard";
import { SignInToApplyCard } from "@/components/gig/SignInToApplyCard";
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

export function GigPageClientV2({
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

  // Auto-submit pending pitch after auth return
  useEffect(() => {
    if (!currentUserId || role !== "visitor" || deal.deal_type !== "public") return;
    if (deal.status !== "pending_acceptance" || deal.freelancer_user_id) return;

    // Check URL param
    const url = new URL(window.location.href);
    const shouldSubmit = url.searchParams.get("submit_pitch") === "true";
    if (!shouldSubmit) return;

    // Clean URL
    url.searchParams.delete("submit_pitch");
    window.history.replaceState(null, "", url.pathname + url.search);

    // Read pitch from sessionStorage
    let savedPitch: string | null = null;
    try {
      savedPitch = sessionStorage.getItem(`checkhire_pending_pitch_${deal.id}`);
    } catch {
      // sessionStorage unavailable
    }

    if (!savedPitch || savedPitch.trim().length < 20) return;

    // Auto-submit the application
    (async () => {
      try {
        const res = await fetch(`/api/deals/${deal.id}/interest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pitch_text: savedPitch!.trim(),
            portfolio_urls: [],
            screening_answers: [],
            file_urls: [],
          }),
        });
        const data = await res.json();
        if (data.ok) {
          try {
            sessionStorage.removeItem(`checkhire_pending_pitch_${deal.id}`);
          } catch {
            // noop
          }
          toast("Application submitted!", "success");
          router.refresh();
        }
      } catch {
        // If auto-submit fails, user can still apply manually
      }
    })();
  }, [currentUserId, deal.id, deal.deal_type, deal.status, deal.freelancer_user_id, role, router, toast]);

  const status = statusMap[deal.status] || statusMap.pending_acceptance;
  const dealUrl = typeof window !== "undefined" ? window.location.href : "";
  const isParticipant = role === "client" || role === "freelancer";
  const freelancerNeedsStripe =
    role === "freelancer" &&
    !guestToken &&
    deal.freelancer?.stripe_onboarding_complete === false &&
    deal.escrow_status !== "unfunded" &&
    !["completed", "cancelled", "refunded"].includes(deal.status);
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
      // Refresh server data so the page reflects the funded escrow status
      const timer = setTimeout(() => router.refresh(), 1500);
      return () => clearTimeout(timer);
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

  const handleLockSlug = async () => {
    if (deal.slug_locked) return;
    try {
      await fetch(`/api/deals/${deal.id}/slug/lock`, { method: "POST" });
    } catch {
      // non-blocking — don't prevent the share action
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

  // ── Action Card Builder — determines what action card shows in the timeline ──
  function buildActionCard(): React.ReactNode {
    // Client: Fund Escrow
    if (role === "client" && hasFreelancer && deal.escrow_status === "unfunded" && deal.status !== "cancelled" && !deal.has_milestones) {
      return (
        <TimelineActionCard delayIndex={activityEntries.length}>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Fund escrow to start work</p>
            <p className="mt-1 text-xs text-slate-600">
              ${(deal.total_amount / 100).toFixed(2)} + ${(platformFee / 100).toFixed(2)} fee (5%) + ${(stripeFee / 100).toFixed(2)} processing
            </p>
            <Button size="sm" onClick={() => handleFundEscrow()} disabled={actionLoading} className="mt-3">
              <DollarSign className="mr-1 h-4 w-4" />
              {actionLoading ? "Redirecting..." : `Fund $${(totalCharge / 100).toFixed(2)}`}
            </Button>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        </TimelineActionCard>
      );
    }
    // Client: Completed — rating
    if (role === "client" && deal.status === "completed" && !userRating) {
      return (
        <TimelineActionCard delayIndex={activityEntries.length}>
          <RatingForm dealId={deal.id} onRated={() => router.refresh()} />
        </TimelineActionCard>
      );
    }
    // Freelancer: Stripe Connect needed
    if (role === "freelancer" && deal.freelancer?.stripe_onboarding_complete === false && deal.escrow_status !== "unfunded") {
      return (
        <TimelineActionCard delayIndex={activityEntries.length}>
          <StripeConnectPrompt onConnect={handleStripeConnect} loading={actionLoading} />
        </TimelineActionCard>
      );
    }
    // Freelancer: Work phase — evidence upload
    if (role === "freelancer" && ["funded", "in_progress", "revision_requested"].includes(deal.status)) {
      return (
        <TimelineActionCard delayIndex={activityEntries.length}>
          <EvidenceUploadCard dealId={deal.id} guestToken={guestToken} onUploaded={refreshActivity} dealStatus={deal.status} />
        </TimelineActionCard>
      );
    }
    // Freelancer: Waiting for client to fund
    if (role === "freelancer" && deal.escrow_status === "unfunded" && hasFreelancer) {
      return (
        <TimelineActionCard delayIndex={activityEntries.length}>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-slate-600">Waiting for client to fund escrow...</p>
            <p className="mt-1 text-xs text-slate-600">You&apos;ll be notified when payment is secured.</p>
          </div>
        </TimelineActionCard>
      );
    }
    // Freelancer: Completed — payout + rating + referral
    if (role === "freelancer" && deal.status === "completed") {
      return (
        <TimelineActionCard delayIndex={activityEntries.length}>
          <div className="space-y-4">
            <InstantPayoutCard amount={deal.total_amount} dealId={deal.id} />
            {!userRating && <RatingForm dealId={deal.id} onRated={() => router.refresh()} />}
            {currentUserId && <ReferralPromptCard amountCents={deal.total_amount} />}
            {isGuestFreelancer && <AccountNudgeBanner />}
          </div>
        </TimelineActionCard>
      );
    }
    // Visitor: Public deal — express interest
    if (role === "visitor" && deal.deal_type === "public" && currentUserId && deal.status === "pending_acceptance" && !deal.freelancer_user_id) {
      return (
        <TimelineActionCard delayIndex={0}>
          <InterestForm
            dealId={deal.id}
            existingInterest={userInterest}
            onSubmitted={() => router.refresh()}
            currentUserId={currentUserId || ""}
            screeningQuestions={
              ((deal as Record<string, unknown>).screening_questions as {
                id: string;
                type: "yes_no" | "short_text" | "multiple_choice";
                text: string;
                options?: string[];
                dealbreaker_answer?: string;
              }[]) || []
            }
          />
        </TimelineActionCard>
      );
    }
    // Visitor: Private deal — guest accept
    if (role === "visitor" && !currentUserId && deal.status === "pending_acceptance" && !hasFreelancer) {
      return (
        <TimelineActionCard delayIndex={0}>
          <GuestAcceptCard
            dealId={deal.id} dealSlug={deal.deal_link_slug} escrowFunded={deal.escrow_status === "funded"} amountCents={deal.total_amount}
            onAccepted={(token) => { setGuestToken(token); refreshActivity(); router.refresh(); }}
          />
        </TimelineActionCard>
      );
    }
    // Visitor: Private deal — authenticated accept
    if (role === "visitor" && currentUserId && deal.status === "pending_acceptance" && !hasFreelancer) {
      return (
        <TimelineActionCard delayIndex={0}>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            {deal.escrow_status === "funded" && (
              <p className="mb-3 text-sm font-semibold text-green-700">{"💰"} Payment Secured — ${(deal.total_amount / 100).toFixed(2)} locked</p>
            )}
            <Button onClick={handleAccept} disabled={actionLoading}>
              {actionLoading ? "Accepting..." : "Accept This Gig"}
            </Button>
          </div>
        </TimelineActionCard>
      );
    }
    return null;
  }

  // ── Mobile Sticky CTA — single button, md:hidden ──
  const mobileCTA = (() => {
    if (role === "client" && hasFreelancer && deal.escrow_status === "unfunded" && deal.status !== "cancelled" && !deal.has_milestones) {
      return <Button onClick={() => handleFundEscrow()} disabled={actionLoading} className="w-full"><DollarSign className="mr-1 h-4 w-4" />{actionLoading ? "Redirecting..." : `Fund Escrow — $${(totalCharge / 100).toFixed(2)}`}</Button>;
    }
    if (role === "client" && deal.status === "submitted") {
      return <Button onClick={() => setConfirmDialogOpen(true)} className="w-full">Confirm &amp; Release ${(deal.total_amount / 100).toFixed(2)}</Button>;
    }
    if ((role === "freelancer" || guestToken) && ["funded", "in_progress", "revision_requested"].includes(deal.status)) {
      const hasEvidence = activityEntries.some(e => e.is_submission_evidence);
      return <Button onClick={() => setSubmitDialogOpen(true)} disabled={!hasEvidence} className="w-full">Submit Work</Button>;
    }
    if (role === "visitor" && currentUserId && deal.status === "pending_acceptance" && !hasFreelancer) {
      return <Button onClick={handleAccept} disabled={actionLoading} className="w-full">{actionLoading ? "Accepting..." : "Accept This Gig"}</Button>;
    }
    return null;
  })();

  return (
    <>
      {/* Rejected deal — visitor sees this only */}
      {deal.review_status === "rejected" && !isParticipant && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-900">This gig is no longer available.</p>
        </div>
      )}

      {!(deal.review_status === "rejected" && !isParticipant) && (
        <div className="mx-auto max-w-4xl px-6 py-10 pb-32 md:pb-10">

          {error && (
            <Alert variant="danger" className="mb-4">
              {error}
            </Alert>
          )}

          {/* ZONE 1: Compact Deal Header */}
          <DealHeader deal={deal} role={role} dealUrl={dealUrl} isParticipant={isParticipant} />

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
                      No funds were released. If you believe this is an error, please contact hello@checkhire.co.
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

          {/* ZONE 2: Step Indicator */}
          <DealStepIndicator dealStatus={deal.status} escrowStatus={deal.escrow_status} hasFreelancer={hasFreelancer} />

          {/* ZONE 3: ShareHub — client only, pending/funded deals */}
          {role === "client" && (deal.status === "pending_acceptance" || deal.status === "funded") && (
            <div className="mb-6 space-y-3">
              <ShareHub dealSlug={deal.deal_link_slug} dealTitle={deal.title} amountCents={deal.total_amount} deadline={deal.deadline} category={deal.category} description={deal.description} clientName={deal.client.display_name || "Client"} escrowFunded={deal.escrow_status === "funded"} onShare={handleLockSlug} />
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
                    {role === "client" && !deal.slug_locked && (
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
          {/* Collapsed share link for active deals */}
          {role === "client" && hasFreelancer && !["pending_acceptance", "funded", "cancelled", "refunded", "completed"].includes(deal.status) && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex-1 select-all font-mono text-sm text-slate-600">checkhire.co/deal/{deal.deal_link_slug}</div>
              <ShareButton url={dealUrl} title={deal.title} />
            </div>
          )}

          {/* ZONE 4: Agreement Details — copy from GigPageClient.tsx lines 583-677 verbatim */}
          {/* Open for visitors, collapsible for participants. Uses termsExpanded state. */}
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

          {/* Interest section for public deals — client view */}
          {role === "client" && deal.deal_type === "public" && (
            <div className="mb-6"><InterestList
              dealId={deal.id}
              interests={interests}
              currentUserId={currentUserId || ""}
              screeningQuestions={
                ((deal as Record<string, unknown>).screening_questions as {
                  id: string;
                  type: string;
                  text: string;
                  options?: string[];
                  dealbreaker_answer?: string;
                }[]) || []
              }
            /></div>
          )}

          {/* ZONE 5: Evidence Timeline + Action Card */}
          {(isParticipant || guestToken) && (
            <div className="mb-6">
              <EvidenceTimeline
                entries={activityEntries} deal={deal} role={guestToken ? "freelancer" : role}
                guestFreelancerName={guestFreelancerName || deal.guest_freelancer_name || null}
                currentUserId={currentUserId}
                onConfirmDelivery={() => setConfirmDialogOpen(true)}
                onRequestRevision={() => { setRevisionNotes(""); setRevisionDialogOpen(true); }}
                onOpenDispute={() => {}}
                actionCard={buildActionCard()}
              />
            </div>
          )}
          {/* Visitor action card (shown standalone when not a participant) */}
          {role === "visitor" && !guestToken && (
            <div className="mb-6">{buildActionCard()}</div>
          )}

          {/* Dispute proposals */}
          {deal.status === "disputed" && disputeId && (
            <div className="mb-6"><ProposalReveal totalAmountCents={deal.total_amount} claimantPercentage={null} respondentPercentage={null} claimantName="Claimant" respondentName="Respondent" isResolved={false} negotiationRound={0} /></div>
          )}

          {/* Ratings section for completed deals */}
          {deal.status === "completed" && isParticipant && (
            <div className="mb-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Ratings</h3>
              {userRating && (
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <p className="mb-2 text-xs font-semibold text-slate-600">Your rating</p>
                  <div className="flex items-center gap-2"><StarRating rating={userRating.stars} size="md" /><span className="text-sm font-semibold text-slate-900">{userRating.stars}/5</span></div>
                  {userRating.comment && <p className="mt-2 text-sm text-slate-600">{userRating.comment}</p>}
                </div>
              )}
              {userRating && otherRating && (
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <p className="mb-2 text-xs font-semibold text-slate-600">{role === "client" ? "Freelancer's" : "Client's"} rating</p>
                  <div className="flex items-center gap-2"><StarRating rating={otherRating.stars} size="md" /><span className="text-sm font-semibold text-slate-900">{otherRating.stars}/5</span></div>
                  {otherRating.comment && <p className="mt-2 text-sm text-slate-600">{otherRating.comment}</p>}
                </div>
              )}
              {userRating && !otherRating && <p className="text-xs text-slate-600">Waiting for the other party to leave their rating...</p>}
            </div>
          )}

          {/* ZONE 6: Below-Timeline Actions (text links) */}
          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
            {role === "client" && deal.status === "pending_acceptance" && deal.escrow_status === "unfunded" && (
              <button type="button" onClick={handleCancelWithRefund} disabled={actionLoading} className="cursor-pointer text-red-600 transition-colors duration-200 hover:text-red-700">Cancel this gig</button>
            )}
            {role === "client" && deal.escrow_status === "funded" && !hasFreelancer && !["completed", "cancelled", "refunded"].includes(deal.status) && (
              <button type="button" onClick={handleCancelWithRefund} disabled={actionLoading} className="cursor-pointer text-red-600 transition-colors duration-200 hover:text-red-700">Cancel &amp; get full refund</button>
            )}
            {role === "client" && deal.escrow_status === "funded" && hasFreelancer && !gracePeriodExpired && !["completed", "cancelled", "refunded", "disputed"].includes(deal.status) && (
              <button type="button" onClick={handleCancelWithRefund} disabled={actionLoading} className="cursor-pointer text-red-600 transition-colors duration-200 hover:text-red-700">
                Cancel &amp; refund {gracePeriodRemaining && `(${gracePeriodRemaining})`}
              </button>
            )}
            {role === "client" && deal.escrow_status === "funded" && hasFreelancer && gracePeriodExpired && !["completed", "cancelled", "refunded", "disputed"].includes(deal.status) && (
              <p className="text-xs text-slate-600">Funds are locked — the freelancer accepted more than 24 hours ago.</p>
            )}
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
            {isParticipant && !["completed", "cancelled", "refunded", "disputed", "pending_acceptance"].includes(deal.status) && deal.escrow_status === "funded" && (
              <DisputeButton dealId={deal.id} dealStatus={deal.status} completedAt={deal.completed_at} totalAmountCents={deal.total_amount} guestToken={guestToken} />
            )}
          </div>

          {/* Guest freelancer account nudge */}
          {isGuestFreelancer && deal.status !== "completed" && <div className="mb-6"><AccountNudgeBanner /></div>}

          {/* ZONE 7: Mobile Sticky CTA */}
          {mobileCTA && (
            <div className="fixed bottom-16 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm px-6 py-3 md:hidden">
              {mobileCTA}
            </div>
          )}

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

        </div>
      )}
    </>
  );
}
