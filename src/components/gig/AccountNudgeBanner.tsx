"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, UserPlus } from "lucide-react";

type Props = {
  /** Context string so the dismissal is scoped per deal (e.g. the dealId) */
  contextKey?: string;
  /** Variant changes the copy based on where it's shown */
  variant?: "early" | "completion";
};

export function AccountNudgeBanner({
  contextKey = "default",
  variant = "early",
}: Props) {
  const storageKey = `checkhire_account_nudge_${contextKey}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(storageKey) === "1";
    } catch {
      // sessionStorage unavailable (SSR or privacy mode)
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // sessionStorage unavailable
    }
  };

  if (dismissed) return null;

  const copy =
    variant === "completion"
      ? {
          headline: "Save your next deal",
          body: "Create a free account with the email you already used. Your payment history and Stripe connection carry over automatically.",
          cta: "Create free account",
        }
      : {
          headline: "Make this easier next time",
          body: "Create a free account so you don't need the email verification code on future deals. Your Stripe connection will be saved.",
          cta: "Create free account",
        };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-xl border border-brand/20 bg-brand-muted p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="rounded-lg bg-white p-2 shrink-0">
              <UserPlus className="h-4 w-4 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {copy.headline}
              </p>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                {copy.body}
              </p>
              <a
                href="/login?mode=signup"
                className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand transition-colors duration-200 hover:text-brand-hover"
              >
                {copy.cta} →
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 cursor-pointer transition-colors duration-200 hover:text-slate-900"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
