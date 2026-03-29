"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Milestone, MilestoneStatus } from "@/types/database";

type Props = {
  milestones: Milestone[];
};

const statusColors: Record<MilestoneStatus, string> = {
  pending_funding: "bg-gray-200",
  funded: "bg-brand",
  in_progress: "bg-blue-500",
  submitted: "bg-amber-500",
  revision_requested: "bg-amber-500",
  approved: "bg-green-500",
  released: "bg-green-500",
  disputed: "bg-red-500",
};

const statusLabels: Record<MilestoneStatus, string> = {
  pending_funding: "Pending",
  funded: "Funded",
  in_progress: "In Progress",
  submitted: "Submitted",
  revision_requested: "Revision",
  approved: "Approved",
  released: "Released",
  disputed: "Disputed",
};

const statusVariants: Record<MilestoneStatus, "default" | "success" | "warning" | "danger" | "outline"> = {
  pending_funding: "outline",
  funded: "success",
  in_progress: "default",
  submitted: "warning",
  revision_requested: "warning",
  approved: "success",
  released: "success",
  disputed: "danger",
};

export function MilestoneTracker({ milestones }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-0">
      {milestones.map((m, i) => (
        <div key={m.id}>
          <button
            type="button"
            onClick={() =>
              setExpandedId(expandedId === m.id ? null : m.id)
            }
            className="flex w-full cursor-pointer items-start gap-3 py-3 text-left transition-colors duration-200 hover:bg-gray-50/50 rounded-lg px-2 -mx-2"
          >
            {/* Stepper circle + line */}
            <div className="relative flex flex-col items-center">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white",
                  statusColors[m.status]
                )}
              >
                {i + 1}
              </div>
              {i < milestones.length - 1 && (
                <div className="mt-1 h-6 w-0.5 bg-gray-200" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 truncate">
                  {m.title}
                </span>
                <Badge variant={statusVariants[m.status]}>
                  {statusLabels[m.status]}
                </Badge>
              </div>
              <span className="font-mono text-xs tabular-nums text-slate-600">
                ${(m.amount / 100).toFixed(2)}
              </span>
            </div>
          </button>

          {/* Expanded description */}
          {expandedId === m.id && m.description && (
            <div className="ml-10 mb-2 rounded-lg bg-gray-50 p-3 text-sm text-slate-600">
              {m.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
