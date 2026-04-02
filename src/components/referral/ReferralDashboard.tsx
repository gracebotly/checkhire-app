"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Link as LinkIcon,
  Copy,
  Check,
  DollarSign,
  Pencil,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ReferralData {
  referral_code: string;
  referral_slug: string | null;
  referral_link: string;
  stats: {
    total_referrals: number;
    total_earnings: number;
    available_balance: number;
    paid_out: number;
  };
  recent_earnings: Array<{
    id: string;
    deal_amount: number;
    referral_commission: number;
    status: string;
    created_at: string;
  }>;
}

export function ReferralDashboard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [slugModalOpen, setSlugModalOpen] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const [slugSaving, setSlugSaving] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [trackingExpanded, setTrackingExpanded] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  async function fetchReferralData() {
    try {
      const res = await fetch("/api/referrals/me");
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Failed to fetch referral data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!data) return;
    await navigator.clipboard.writeText(data.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveSlug() {
    setSlugError("");
    setSlugSaving(true);
    try {
      const res = await fetch("/api/referrals/slug", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: newSlug.toLowerCase() }),
      });
      if (res.ok) {
        const json = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                referral_slug: json.referral_slug,
                referral_link: json.referral_link,
              }
            : null,
        );
        setSlugModalOpen(false);
        setNewSlug("");
      } else {
        const err = await res.json();
        setSlugError(err.error || "Failed to save slug");
      }
    } catch {
      setSlugError("Network error");
    } finally {
      setSlugSaving(false);
    }
  }

  async function requestPayout() {
    setPayoutLoading(true);
    try {
      const res = await fetch("/api/referrals/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "manual" }),
      });
      if (res.ok) {
        fetchReferralData();
      } else {
        const err = await res.json();
        setSlugError(err.error || "Failed to request payout");
      }
    } catch {
      setSlugError("Network error");
    } finally {
      setPayoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-6 bg-gray-100 rounded w-48 mb-4" />
        <div className="h-10 bg-gray-100 rounded mb-4" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-16 bg-gray-100 rounded-lg" />
          <div className="h-16 bg-gray-100 rounded-lg" />
          <div className="h-16 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const hasEarnings = data.stats.total_earnings > 0;
  const payoutEligible = data.stats.available_balance >= 2500;
  const progressPercent = hasEarnings && !payoutEligible
    ? Math.min((data.stats.available_balance / 2500) * 100, 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="bg-white rounded-xl border border-gray-200 p-5"
    >
      <h3 className="font-display text-lg font-semibold text-slate-900 mb-1">
        Share CheckHire, earn on every deal
      </h3>
      <p className="text-sm text-slate-600 mb-4">
        Every user you refer earns you 20% of our platform fee for 12 months.
      </p>

      {/* Referral link */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5 flex items-center gap-2 min-w-0">
          <LinkIcon className="h-4 w-4 text-slate-600 shrink-0" />
          <span className="text-sm font-mono text-slate-900 truncate">{data.referral_link}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={copyLink}
          className="shrink-0 cursor-pointer transition-colors duration-200"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" /> Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" /> Copy
            </>
          )}
        </Button>
      </div>

      {/* How tracking works — collapsible */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setTrackingExpanded(!trackingExpanded)}
          className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900"
        >
          <Info className="h-3.5 w-3.5" />
          <span>How does tracking work?</span>
          {trackingExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
        {trackingExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-2 rounded-lg bg-gray-50 p-3 space-y-2"
          >
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">30-day cookie.</span>{" "}
              When someone clicks your link, we track them for 30 days. If they sign up within that window, they&apos;re credited to you.
            </p>
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">First click wins.</span>{" "}
              If someone clicks multiple referral links, the first one gets the credit.
            </p>
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">12-month earnings.</span>{" "}
              Once someone is credited to you, you earn 20% of our net platform fee on every deal they complete for 12 months.
            </p>
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">Automatic.</span>{" "}
              Commissions are calculated and credited after each completed deal. No action needed from you.
            </p>
          </motion.div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xl font-semibold text-slate-900 font-mono tabular-nums">
            {data.stats.total_referrals}
          </div>
          <div className="text-xs text-slate-600 mt-0.5">Referrals</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xl font-semibold text-slate-900 font-mono tabular-nums">
            {formatCents(data.stats.total_earnings)}
          </div>
          <div className="text-xs text-slate-600 mt-0.5">Earned</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xl font-semibold text-slate-900 font-mono tabular-nums">
            {formatCents(data.stats.available_balance)}
          </div>
          <div className="text-xs text-slate-600 mt-0.5">Balance</div>
        </div>
      </div>

      {/* Customize link button — always visible */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setNewSlug(data.referral_slug || "");
            setSlugModalOpen(true);
          }}
          className="cursor-pointer transition-colors duration-200"
        >
          <Pencil className="h-4 w-4 mr-1" /> Customize link
        </Button>
      </div>

      {/* ═══ PAYOUT SECTION — 3 states ═══ */}

      {/* State 1: No earnings — don't show payout section at all */}

      {/* State 2: Has earnings but under $25 — show progress */}
      {hasEarnings && !payoutEligible && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-900">
              {formatCents(data.stats.available_balance)} of $25.00 to unlock cash-out
            </p>
            <span className="text-xs font-mono tabular-nums text-slate-600">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-brand"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Keep sharing your link. You&apos;ll be able to cash out once your balance reaches $25.
          </p>
        </div>
      )}

      {/* State 3: $25+ balance — cash out eligible */}
      {payoutEligible && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-900">
                Cash out available
              </p>
              <p className="mt-0.5 text-xs text-green-800">
                Minimum $25. Payouts are processed manually and typically arrive within 5–7 business days.
              </p>
            </div>
            <Button
              size="sm"
              onClick={requestPayout}
              disabled={payoutLoading}
              className="shrink-0 cursor-pointer transition-colors duration-200"
            >
              <DollarSign className="h-4 w-4 mr-1" />
              {payoutLoading ? "Processing..." : `Cash out ${formatCents(data.stats.available_balance)}`}
            </Button>
          </div>
        </div>
      )}

      {/* Recent earnings — only show if there are any */}
      {data.recent_earnings.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Recent earnings</h4>
          <div className="space-y-0">
            {data.recent_earnings.map((earning, index) => (
              <motion.div
                key={earning.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
                className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-600">
                    {new Date(earning.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-sm text-slate-600">{formatCents(earning.deal_amount)} deal</span>
                </div>
                <span className="text-sm font-semibold text-slate-900 font-mono tabular-nums">
                  +{formatCents(earning.referral_commission)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Customize slug modal */}
      <Dialog.Root open={slugModalOpen} onOpenChange={setSlugModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl border border-gray-200 p-6 w-full max-w-md z-50 shadow-lg">
            <Dialog.Title className="font-display text-lg font-semibold text-slate-900 mb-1">
              Customize your referral link
            </Dialog.Title>
            <Dialog.Description className="text-sm text-slate-600 mb-4">
              Choose a custom slug for your referral URL.
            </Dialog.Description>

            <div className="mb-2">
              <Input
                value={newSlug}
                onChange={(e) => {
                  setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  setSlugError("");
                }}
                placeholder="your-name"
                className="mb-1"
              />
              <p className="text-xs text-slate-600 font-mono">checkhire.co/ref/{newSlug || "..."}</p>
              {slugError && <p className="text-xs text-red-600 mt-1">{slugError}</p>}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSlugModalOpen(false)}
                className="cursor-pointer transition-colors duration-200"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={saveSlug}
                disabled={newSlug.length < 3 || slugSaving}
                className="cursor-pointer transition-colors duration-200"
              >
                {slugSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </motion.div>
  );
}
