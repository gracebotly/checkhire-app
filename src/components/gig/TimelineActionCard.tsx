"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";

type Props = {
  children: React.ReactNode;
  delayIndex?: number;
  /** Optional step number (1, 2, or 3) — if provided, renders the step progress header */
  stepNumber?: 1 | 2 | 3;
  /** Total steps (defaults to 3) — used with stepNumber */
  totalSteps?: number;
  /** Optional headline shown above the children (e.g. "Payment locked. You're protected.") */
  headline?: string;
  /** Optional subtext shown below the headline */
  subtext?: string;
  /** If true, renders the step as completed (checkmark, muted) — used for past steps */
  completed?: boolean;
};

export function TimelineActionCard({
  children,
  delayIndex = 0,
  stepNumber,
  totalSteps = 3,
  headline,
  subtext,
  completed = false,
}: Props) {
  const showStepHeader = stepNumber !== undefined && (headline || subtext);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: delayIndex * 0.04 }}
      className="flex gap-3 relative mt-4"
    >
      <div className="z-10 shrink-0">
        <div
          className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border-2 bg-white ${
            completed ? "border-green-600" : "border-brand"
          }`}
        >
          {completed ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : stepNumber ? (
            <span className="font-mono text-xs font-bold text-brand">
              {stepNumber}
            </span>
          ) : (
            <div className="h-2.5 w-2.5 rounded-full bg-brand animate-pulse" />
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0 pb-1">
        {showStepHeader && (
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              Step {stepNumber} of {totalSteps}
            </p>
            {headline && (
              <p className="mt-1 text-base font-semibold text-slate-900">
                {headline}
              </p>
            )}
            {subtext && (
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                {subtext}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </motion.div>
  );
}
