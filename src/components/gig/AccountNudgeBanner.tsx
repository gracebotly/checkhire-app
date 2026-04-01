"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export function AccountNudgeBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="bg-brand-muted border border-brand/20 rounded-lg p-3"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-slate-700">
            Want to build your reputation?{" "}
            <a
              href="/login?mode=signup"
              className="text-sm font-semibold text-brand cursor-pointer transition-colors duration-200 hover:text-brand-hover"
            >
              Create a free account
            </a>{" "}
            to track your gigs and earn trust badges.
          </p>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 cursor-pointer transition-colors duration-200 hover:text-slate-900"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
