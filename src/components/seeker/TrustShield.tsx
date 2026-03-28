"use client";

import { cn } from "@/lib/utils";
import type { DisclosureLevel } from "@/types/database";
import { Eye, Lock, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface TrustShieldProps {
  disclosureLevel: DisclosureLevel;
}

const PROTECTION_ITEMS = [
  { field: "Real name", hiddenUntil: 2, revealedLabel: "First name visible" },
  { field: "Full name", hiddenUntil: 3, revealedLabel: "Full name visible" },
  { field: "Email address", hiddenUntil: 999, revealedLabel: "" }, // never revealed
  { field: "Phone number", hiddenUntil: 999, revealedLabel: "" },
  { field: "Resume PDF", hiddenUntil: 3, revealedLabel: "Resume accessible" },
];

/**
 * Visual shield showing what data is protected at the current stage.
 * Green locks = protected, amber eyes = revealed.
 */
export function TrustShield({ disclosureLevel }: TrustShieldProps) {
  const protectedCount = PROTECTION_ITEMS.filter(
    (item) => disclosureLevel < item.hiddenUntil
  ).length;
  const totalCount = PROTECTION_ITEMS.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-brand" />
        <h3 className="text-xs font-semibold text-slate-900">Data Protection</h3>
        <span className="ml-auto rounded-full bg-brand-muted px-2 py-0.5 text-[10px] font-semibold text-brand">
          {protectedCount}/{totalCount} protected
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        {PROTECTION_ITEMS.map((item) => {
          const isProtected = disclosureLevel < item.hiddenUntil;
          return (
            <div
              key={item.field}
              className="flex items-center gap-2 text-xs"
            >
              {isProtected ? (
                <Lock className="h-3 w-3 shrink-0 text-emerald-600" />
              ) : (
                <Eye className="h-3 w-3 shrink-0 text-amber-600" />
              )}
              <span className={cn(isProtected ? "text-slate-900" : "text-slate-600")}>
                {isProtected ? `${item.field} — hidden` : item.revealedLabel}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
