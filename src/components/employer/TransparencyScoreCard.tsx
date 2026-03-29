"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Clock, FileCheck, MessageSquare, Star, Flag } from "lucide-react";
import type { TransparencyScoreBreakdown } from "@/types/database";

const COMPONENT_CONFIG = [
  { key: "hire_rate", label: "Hire rate", icon: TrendingUp, weight: "30%", color: "bg-emerald-500" },
  { key: "responsiveness", label: "Responsiveness", icon: Clock, weight: "20%", color: "bg-blue-500" },
  { key: "closeout_compliance", label: "Close-out compliance", icon: FileCheck, weight: "15%", color: "bg-brand" },
  { key: "checkin_results", label: "Check-in results", icon: MessageSquare, weight: "15%", color: "bg-violet-500" },
  { key: "review_rate", label: "Application review rate", icon: Star, weight: "10%", color: "bg-amber-500" },
] as const;

export function TransparencyScoreCard() {
  const [score, setScore] = useState<TransparencyScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employer/transparency-score")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.score) setScore(data.score);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">Transparency Score</h3>
        </div>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">Transparency Score</h3>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Your score will appear after your first listing activity.
        </p>
      </div>
    );
  }

  const scoreColor =
    score.total >= 4 ? "text-emerald-600" :
    score.total >= 3 ? "text-brand" :
    score.total >= 2 ? "text-amber-600" :
    "text-red-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">Transparency Score</h3>
        </div>
        <span className={`text-2xl font-bold tabular-nums ${scoreColor}`}>
          {score.total.toFixed(1)}
          <span className="text-sm font-medium text-slate-600">/5.0</span>
        </span>
      </div>

      {score.last_calculated_at && (
        <p className="mt-1 text-xs text-slate-600">
          Last calculated{" "}
          {new Date(score.last_calculated_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      )}

      <div className="mt-4 space-y-2.5">
        {COMPONENT_CONFIG.map(({ key, label, icon: Icon, weight, color }) => {
          const value = score[key as keyof TransparencyScoreBreakdown] as number;
          const pct = Math.max(0, Math.min(100, (value / 5) * 100));
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  <span className="text-slate-600">({weight})</span>
                </span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {value.toFixed(1)}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                <div
                  className={`h-1.5 rounded-full ${color} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}

        {score.flag_penalty > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 text-red-700">
              <Flag className="h-3.5 w-3.5" />
              Flag penalty
            </span>
            <span className="font-semibold tabular-nums text-red-700">
              -{score.flag_penalty.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
