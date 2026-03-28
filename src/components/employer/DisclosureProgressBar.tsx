"use client";

import { cn } from "@/lib/utils";
import type { DisclosureLevel } from "@/types/database";

interface DisclosureProgressBarProps {
  level: DisclosureLevel;
  size?: "sm" | "md";
}

const STAGE_LABELS: Record<DisclosureLevel, { label: string; detail: string }> = {
  1: { label: "Stage 1", detail: "Pseudonym only" },
  2: { label: "Stage 2", detail: "First name revealed" },
  3: { label: "Stage 3", detail: "Full name + resume" },
};

/**
 * Compact disclosure indicator for employer's CandidateCard.
 */
export function DisclosureProgressBar({ level, size = "sm" }: DisclosureProgressBarProps) {
  const info = STAGE_LABELS[level];

  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={cn(
            "rounded-full",
            size === "sm" ? "h-1 w-4" : "h-1.5 w-6",
            step <= level ? "bg-brand" : "bg-gray-200"
          )}
        />
      ))}
      <span className={cn("text-slate-600", size === "sm" ? "text-[10px]" : "text-xs")}>
        {info.detail}
      </span>
    </div>
  );
}
