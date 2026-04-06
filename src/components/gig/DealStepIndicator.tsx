"use client";

import { motion } from "motion/react";
import {
  Check,
  DollarSign,
  FileText,
  Briefcase,
  Send,
  CheckCircle,
  Users,
  AlertTriangle,
} from "lucide-react";
import type { DealStatus, EscrowStatus } from "@/types/database";

type DealStep = "created" | "accepted" | "funded" | "work" | "delivered" | "paid";

type Props = {
  dealStatus: DealStatus;
  escrowStatus: EscrowStatus;
  hasFreelancer: boolean;
  dealType?: "private" | "public";
};

const STEPS: { key: DealStep; label: string; icon: React.ElementType }[] = [
  { key: "created", label: "Created", icon: FileText },
  { key: "accepted", label: "Accepted", icon: Users },
  { key: "funded", label: "Funded", icon: DollarSign },
  { key: "work", label: "Work", icon: Briefcase },
  { key: "delivered", label: "Delivered", icon: Send },
  { key: "paid", label: "Paid", icon: CheckCircle },
];

function getDealStep(
  dealStatus: DealStatus,
  escrowStatus: EscrowStatus,
  hasFreelancer: boolean
): DealStep {
  if (dealStatus === "completed") return "paid";
  if (dealStatus === "submitted" || dealStatus === "revision_requested") return "delivered";
  if (dealStatus === "in_progress") return "work";
  if (dealStatus === "funded" || (escrowStatus === "funded" && hasFreelancer)) return "work";
  if (escrowStatus === "funded" && !hasFreelancer) return "funded";
  if (hasFreelancer && escrowStatus === "unfunded") return "funded";
  if (dealStatus === "pending_acceptance" && !hasFreelancer) return "accepted";
  return "created";
}

export function DealStepIndicator({ dealStatus, escrowStatus, hasFreelancer, dealType }: Props) {
  if (dealStatus === "cancelled" || dealStatus === "refunded") return null;

  const isDisputed = dealStatus === "disputed";
  const isPrivate = dealType === "private";
  const visibleSteps = isPrivate ? STEPS.filter((s) => s.key !== "accepted") : STEPS;
  const rawStep = getDealStep(dealStatus, escrowStatus, hasFreelancer);
  const currentStep = isPrivate && rawStep === "accepted" ? "created" : rawStep;
  const currentIndex = visibleSteps.findIndex((s) => s.key === currentStep);

  return (
    <div className="mb-6 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
      <style>{`.deal-step-scroll::-webkit-scrollbar { display: none; }`}</style>
      <div className="deal-step-scroll flex min-w-[400px] items-center px-1 py-2">
        {visibleSteps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25, delay: i * 0.05, ease: "easeOut" }}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200 ${
                    isDisputed && isCurrent
                      ? "border-2 border-red-400 bg-red-50 text-red-600"
                      : isCompleted
                        ? "bg-brand text-white"
                        : isCurrent
                          ? "border-2 border-brand bg-white text-brand"
                          : "bg-gray-100 text-slate-600"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : isDisputed && isCurrent ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </motion.div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${
                  isDisputed && isCurrent ? "text-red-600" : isCompleted || isCurrent ? "text-brand" : "text-slate-600"
                }`}>
                  {isDisputed && isCurrent ? "Disputed" : step.label}
                </span>
              </div>
              {i < visibleSteps.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 rounded-full transition-colors duration-200 ${isCompleted ? "bg-brand" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
