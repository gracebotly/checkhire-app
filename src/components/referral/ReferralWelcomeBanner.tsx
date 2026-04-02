"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { UserPlus, X, ArrowRight } from "lucide-react";
import Link from "next/link";

export function ReferralWelcomeBanner() {
  const [dismissed, setDismissed] = useState(false);

  // Clean the URL param after reading it (so it doesn't persist on refresh/share)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("referred")) {
        url.searchParams.delete("referred");
        window.history.replaceState(null, "", url.pathname + url.search);
      }
    }
  }, []);

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="border-b border-brand-muted bg-brand-muted"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10">
            <UserPlus className="h-4 w-4 text-brand" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              You were invited to CheckHire
            </p>
            <p className="text-xs text-slate-600 hidden sm:block">
              The safest way to pay someone you met online. Create your first protected deal — the person who invited you benefits too.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/create"
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="cursor-pointer rounded-lg p-1.5 text-slate-600 transition-colors duration-200 hover:bg-white/60 hover:text-slate-900"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
