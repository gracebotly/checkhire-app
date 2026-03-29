"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flag, Clock, CheckCircle, XCircle, Search } from "lucide-react";
import type { FlagStatus } from "@/types/database";

type FlagSummary = {
  id: string;
  target_type: string;
  reason: string;
  status: FlagStatus;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
};

const STATUS_CONFIG: Record<FlagStatus, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "Pending review", icon: Clock, color: "text-amber-600" },
  investigating: { label: "Under investigation", icon: Search, color: "text-blue-600" },
  resolved: { label: "Resolved", icon: CheckCircle, color: "text-emerald-600" },
  dismissed: { label: "Dismissed", icon: XCircle, color: "text-slate-600" },
};

export function FlagStatusCard() {
  const [flags, setFlags] = useState<FlagSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/flags")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setFlags(data.flags || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">Your reports</h3>
        <div className="mt-3 h-16 animate-pulse rounded-lg bg-gray-50" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-900">Your reports</h3>
      </div>

      {flags.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          You haven&apos;t submitted any reports yet.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {flags.map((flag) => {
            const config = STATUS_CONFIG[flag.status];
            const StatusIcon = config.icon;
            return (
              <div
                key={flag.id}
                className="rounded-lg border border-gray-100 px-3 py-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-slate-900">
                    {flag.reason.replace(/_/g, " ")}
                  </span>
                  <span className={`flex items-center gap-1 text-xs ${config.color}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {config.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600">
                  {flag.target_type === "listing" ? "Job listing" : "Company"} — reported{" "}
                  {new Date(flag.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                {flag.status === "resolved" && flag.resolution_notes && (
                  <p className="mt-1 text-xs text-slate-600">
                    Resolution: {flag.resolution_notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
