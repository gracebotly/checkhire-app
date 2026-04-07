"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CreditCard, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  dealId?: string;
  dealSlug?: string;
  totalAmountCents?: number;
  hasMilestones?: boolean;
  stripeConnected?: boolean;
  escrowStatus?: string;
  onConnect?: () => Promise<void> | void;
  loading?: boolean;
  /** Guest token — when provided, component connects via /api/stripe/guest-connect instead of onConnect callback */
  guestToken?: string | null;
}

export function StripeConnectPrompt({
  dealId,
  dealSlug,
  totalAmountCents,
  hasMilestones,
  stripeConnected,
  escrowStatus,
  onConnect,
  loading = false,
  guestToken = null,
}: Props) {
  void dealSlug;
  const [fundingLoading, setFundingLoading] = useState(false);
  const [guestConnecting, setGuestConnecting] = useState(false);
  const [error, setError] = useState("");

  const handleGuestConnect = async () => {
    if (!dealId || !guestToken) return;
    setGuestConnecting(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/guest-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId, guest_token: guestToken }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Failed to start Stripe onboarding");
      if (data.already_connected) {
        // Already onboarded — refresh the page so the timeline re-renders without this prompt
        window.location.reload();
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect Stripe");
      setGuestConnecting(false);
    }
  };

  const amountCents = totalAmountCents ?? 0;
  const platformFee = Math.round(amountCents * 0.05);
  const subtotalCents = amountCents + platformFee;
  const totalCharge = Math.round((subtotalCents + 30) / (1 - 0.029));
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleFundEscrow = async () => {
    if (!dealId) return;
    setFundingLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setFundingLoading(false);
    }
  };

  // Guest freelancer mode — render when guestToken is provided and we need Stripe connected
  // Note: this takes priority over onConnect mode (which is for authenticated clients funding escrow)
  if (guestToken && !stripeConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-xl border border-amber-200 bg-amber-50 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Shield className="h-5 w-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">
              Connect Stripe to receive payment
            </h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              You need to connect a Stripe account to receive your payment when the client confirms delivery. No CheckHire account needed — Stripe handles everything. Takes about 2 minutes.
            </p>
            <Button
              size="sm"
              onClick={handleGuestConnect}
              disabled={guestConnecting || loading}
              className="mt-3"
            >
              {guestConnecting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-1.5 h-4 w-4" />
              )}
              {guestConnecting ? "Connecting..." : "Connect Stripe"}
            </Button>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        </div>
      </motion.div>
    );
  }

  if (escrowStatus === "funded" || escrowStatus === "released") return null;

  if (onConnect && !stripeConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-xl border border-amber-200 bg-amber-50 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Shield className="h-5 w-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">Connect Stripe to fund escrow</h3>
            <p className="mt-1 text-xs text-slate-600">
              Connect Stripe first, then fund this deal so the freelancer can see payment is secured.
            </p>
            <Button
              size="sm"
              onClick={() => onConnect()}
              disabled={loading}
              className="mt-3"
            >
              {loading ? "Connecting..." : "Connect Stripe"}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (escrowStatus === "unfunded") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-xl border border-teal-200 bg-teal-50 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-teal-100 p-2">
            <Shield className="h-5 w-5 text-teal-700" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">Lock your payment to build trust</h3>
            <p className="mt-1 text-xs text-slate-600">
              Funded deals get more responses. The freelancer sees the exact amount secured before starting work. Full refund if nobody accepts within 30 days.
            </p>
            {!hasMilestones && (
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={handleFundEscrow}
                  disabled={fundingLoading}
                  className="bg-teal-700 text-white hover:bg-teal-800"
                >
                  {fundingLoading ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-1.5 h-4 w-4" />
                  )}
                  {fundingLoading ? "Redirecting..." : `Fund Escrow — ${fmt(totalCharge)}`}
                </Button>
                <p className="mt-1.5 text-xs text-slate-600">
                  {fmt(amountCents)} to freelancer + {fmt(platformFee)} fee (5%) + {fmt(totalCharge - subtotalCents)} processing
                </p>
              </div>
            )}
            {hasMilestones && (
              <p className="mt-2 text-xs text-slate-600">
                Fund individual milestones from the milestone section below.
              </p>
            )}
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Or share the link unfunded — you can always fund later.
        </p>
      </motion.div>
    );
  }

  return null;
}
