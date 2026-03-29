"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flag, Loader2, CheckCircle, XCircle, Search } from "lucide-react";

type FlagEntry = {
  id: string;
  reporter_type: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string | null;
  status: string;
  severity_weight: number;
  resolution_notes: string | null;
  created_at: string;
};

const STATUS_TABS = ["pending", "investigating", "resolved", "dismissed"] as const;

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<FlagEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/flags?status=${activeTab}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        if (active && data.ok) setFlags(data.flags || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab]);

  async function handleAction(flagId: string, newStatus: string) {
    setActionLoading(flagId);
    try {
      const res = await fetch(`/api/admin/flags/${flagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        setFlags((prev) => prev.filter((f) => f.id !== flagId));
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900">Flag Review Queue</h1>

      <div className="mt-4 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors duration-200 ${
              activeTab === tab
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
        </div>
      ) : flags.length === 0 ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <Flag className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-2 text-sm text-slate-600">No {activeTab} flags.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {flags.map((flag, i) => (
            <motion.div
              key={flag.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                      flag.severity_weight >= 3 ? "border-red-200 bg-red-50 text-red-700" :
                      flag.severity_weight >= 2 ? "border-amber-200 bg-amber-50 text-amber-700" :
                      "border-gray-200 bg-gray-50 text-slate-600"
                    }`}>
                      {flag.reason.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-slate-600">
                      {flag.target_type} · {flag.reporter_type}
                    </span>
                    <span className="text-xs text-slate-600">
                      Severity: {flag.severity_weight}
                    </span>
                  </div>
                  {flag.description && (
                    <p className="mt-2 text-sm text-slate-600">{flag.description}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-600">
                    Target ID: <span className="font-mono text-xs">{flag.target_id.slice(0, 8)}...</span>
                    {" · "}
                    {new Date(flag.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>

                {(activeTab === "pending" || activeTab === "investigating") && (
                  <div className="flex shrink-0 gap-2">
                    {activeTab === "pending" && (
                      <button
                        onClick={() => handleAction(flag.id, "investigating")}
                        disabled={actionLoading === flag.id}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors duration-200 hover:bg-blue-100 disabled:opacity-50"
                      >
                        <Search className="h-3 w-3" />
                        Investigate
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(flag.id, "resolved")}
                      disabled={actionLoading === flag.id}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors duration-200 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Resolve
                    </button>
                    <button
                      onClick={() => handleAction(flag.id, "dismissed")}
                      disabled={actionLoading === flag.id}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <XCircle className="h-3 w-3" />
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
