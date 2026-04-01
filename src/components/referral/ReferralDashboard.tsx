"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link as LinkIcon, Copy, Check, DollarSign, Pencil } from "lucide-react";
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

      <div className="flex items-center gap-3 mb-5">
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
        <Button
          variant="default"
          size="sm"
          onClick={requestPayout}
          disabled={data.stats.available_balance < 2500 || payoutLoading}
          className="cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <DollarSign className="h-4 w-4 mr-1" />
          Cash out ({formatCents(data.stats.available_balance)})
        </Button>
      </div>

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
              <p className="text-xs text-slate-600 font-mono">checkhire.com/ref/{newSlug || "..."}</p>
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
