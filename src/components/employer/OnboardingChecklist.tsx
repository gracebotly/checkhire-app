"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Building2,
  Mail,
  FileText,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

type OnboardingStep = {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: typeof Building2;
  completed: boolean;
};

interface OnboardingChecklistProps {
  companyName: string | null;
  websiteDomain: string | null;
  description: string | null;
  domainEmailVerified: boolean;
  hasListings: boolean;
}

export function OnboardingChecklist({
  companyName,
  websiteDomain,
  description,
  domainEmailVerified,
  hasListings,
}: OnboardingChecklistProps) {
  const profileComplete = !!(companyName && websiteDomain && description);

  const steps: OnboardingStep[] = [
    {
      key: "profile",
      label: "Complete your company profile",
      description:
        "Add your website, description, and industry so candidates know who you are.",
      href: "/employer/settings?tab=company",
      icon: Building2,
      completed: profileComplete,
    },
    {
      key: "verify",
      label: "Verify your company email",
      description:
        "Confirm you work at the company you represent. Required before posting.",
      href: "/employer/verify-email",
      icon: Mail,
      completed: domainEmailVerified,
    },
    {
      key: "listing",
      label: "Post your first listing",
      description:
        "Create a verified job listing with salary, requirements, and screening questions.",
      href: "/employer/listings/new",
      icon: FileText,
      completed: hasListings,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allDone = completedCount === steps.length;

  // Don't show if all steps completed
  if (allDone) return null;

  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border border-brand/20 bg-brand-muted p-5 font-sans"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand" />
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Get started with CheckHire
          </h3>
        </div>
        <span className="text-xs font-medium tabular-nums text-brand">
          {completedCount}/{steps.length} complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-white">
        <div
          className="h-1.5 rounded-full bg-brand transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps */}
      <div className="mt-4 space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04, ease: "easeOut" }}
            >
              <Link
                href={step.href}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 transition-colors duration-200 ${
                  step.completed
                    ? "border-gray-100 opacity-60"
                    : "border-gray-200 hover:border-brand/30 hover:bg-brand-muted/30"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-slate-600" />
                      <p
                        className={`text-sm font-medium ${
                          step.completed
                            ? "text-slate-600 line-through"
                            : "text-slate-900"
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                    {!step.completed && (
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                    )}
                  </div>
                  {!step.completed && (
                    <p className="mt-0.5 text-xs text-slate-600">
                      {step.description}
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
