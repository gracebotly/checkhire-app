"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReferralData {
  referral_link: string;
  referral_code: string;
}

export function ReferralPromptCard({ amountCents }: { amountCents: number }) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/referrals/me");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // Silently fail — this is a non-critical prompt
      }
    }
    load();
  }, []);

  if (dismissed || !data) return null;

  const formattedAmount = (amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  async function copyLink() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted">
          <Gift className="h-4 w-4 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-900">
            You just got paid {formattedAmount}
          </h4>
          <p className="mt-0.5 text-sm text-slate-600">
            Know someone who&apos;d want this? Share CheckHire and earn 20% of
            our fee on every deal they make for 12 months.
          </p>

          {/* Referral link + copy */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 min-w-0 rounded-lg bg-gray-50 px-3 py-2">
              <span className="block truncate font-mono text-xs text-slate-900">
                {data.referral_link}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyLink}
              className="shrink-0 cursor-pointer transition-colors duration-200"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" /> Copy
                </>
              )}
            </Button>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            className="mt-2 text-xs text-slate-600 cursor-pointer transition-colors duration-200 hover:text-slate-900"
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}
