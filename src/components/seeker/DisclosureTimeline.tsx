"use client";

import { cn } from "@/lib/utils";
import type { DisclosureLevel } from "@/types/database";
import { Eye, Lock, Shield, User } from "lucide-react";
import { motion } from "framer-motion";

interface DisclosureTimelineProps {
  currentLevel: DisclosureLevel;
}

const STAGES = [
  {
    level: 1 as DisclosureLevel,
    label: "Pseudonym",
    description: "Only your skills and experience are visible",
    icon: Shield,
  },
  {
    level: 2 as DisclosureLevel,
    label: "First Name",
    description: "Your first name is shared with the employer",
    icon: User,
  },
  {
    level: 3 as DisclosureLevel,
    label: "Full Name",
    description: "Full name and resume are accessible",
    icon: Eye,
  },
];

/**
 * Horizontal stepper showing the current disclosure stage.
 * Animated transitions when the stage advances.
 */
export function DisclosureTimeline({ currentLevel }: DisclosureTimelineProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-xs font-semibold text-slate-900">Your Privacy Level</h3>
      <div className="mt-3 flex items-center gap-1">
        {STAGES.map((stage, i) => {
          const isActive = currentLevel >= stage.level;
          const isCurrent = currentLevel === stage.level;
          const Icon = isActive ? stage.icon : Lock;

          return (
            <div key={stage.level} className="flex flex-1 items-center">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isActive ? "hsl(172, 66%, 32%)" : "hsl(220, 14%, 96%)",
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  isCurrent && "ring-2 ring-brand/30 ring-offset-2"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-600")} />
              </motion.div>
              {i < STAGES.length - 1 && (
                <div className="mx-1 h-0.5 flex-1">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: currentLevel > stage.level
                        ? "hsl(172, 66%, 32%)"
                        : "hsl(220, 13%, 91%)",
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="h-full rounded-full"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex">
        {STAGES.map((stage) => {
          const isCurrent = currentLevel === stage.level;
          return (
            <div key={stage.level} className="flex-1 text-center">
              <p className={cn("text-[10px] font-medium", isCurrent ? "text-brand" : "text-slate-600")}>
                {stage.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
