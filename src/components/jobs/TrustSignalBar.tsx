"use client";

import { motion } from "framer-motion";
import { TierBadge } from "@/components/jobs/TierBadge";
import { CalendarCheck, Clock, BarChart3 } from "lucide-react";
import type { TierLevel } from "@/types/database";

interface TrustSignalBarProps {
  tier: TierLevel;
  respondByDate: string | null;
  fillByDate: string | null;
  transparencyScore: number;
}

export function TrustSignalBar({
  tier,
  respondByDate,
  fillByDate,
  transparencyScore,
}: TrustSignalBarProps) {
  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.04, ease: "easeOut" }}
      className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-3"
    >
      <TierBadge tier={tier} size="md" />

      <div className="h-5 w-px bg-gray-200" />

      {respondByDate && (
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Clock className="h-4 w-4" />
          <span>
            Respond by{" "}
            <span className="font-semibold text-slate-900">
              {formatDate(respondByDate)}
            </span>
          </span>
        </div>
      )}

      {fillByDate && (
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <CalendarCheck className="h-4 w-4" />
          <span>
            Hiring by{" "}
            <span className="font-semibold text-slate-900">
              {formatDate(fillByDate)}
            </span>
          </span>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-slate-600">
        <BarChart3 className="h-4 w-4" />
        <span>
          Employer score{" "}
          <span className="font-semibold text-slate-900">
            {transparencyScore > 0 ? `${transparencyScore}/5.0` : "—"}
          </span>
        </span>
      </div>
    </motion.div>
  );
}
