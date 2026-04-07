"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Check, X, AlertTriangle } from "lucide-react";
import type { CancellationRequest } from "@/types/database";

type Props = {
  requests: CancellationRequest[];
  currentUserId: string | null;
};

const STATUS_META = {
  accepted: {
    icon: Check,
    label: "Accepted",
  },
  rejected: {
    icon: X,
    label: "Rejected",
  },
  escalated: {
    icon: AlertTriangle,
    label: "Escalated to dispute",
  },
} as const;

export function CancellationRequestsHistory({ requests, currentUserId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const resolved = requests.filter((r) => r.status !== "pending");

  if (resolved.length === 0) return null;

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-3 text-left transition-colors duration-200 hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-600" />
          )}
          <span className="text-sm font-medium text-slate-900">
            Past cancellation requests
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {resolved.length}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-3">
          <div className="space-y-3">
            {resolved.map((req) => {
              const meta = STATUS_META[req.status as keyof typeof STATUS_META];
              if (!meta) return null;
              const Icon = meta.icon;
              const wasYou = req.requested_by === currentUserId;

              return (
                <div
                  key={req.id}
                  className="rounded-lg border border-gray-100 bg-white p-3"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </div>
                      <span className="text-xs text-slate-600">
                        {wasYou ? "You requested" : "Requested by other party"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-600">
                      {formatDate(req.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="font-mono tabular-nums">
                      {fmt(req.proposed_client_refund_cents)} refund
                    </span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">
                      {fmt(req.proposed_freelancer_payout_cents)} to freelancer
                    </span>
                  </div>

                  {req.reason && (
                    <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
                      <span className="font-medium text-slate-900">Reason:</span>{" "}
                      {req.reason}
                    </p>
                  )}
                  {req.response_reason && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                      <span className="font-medium text-slate-900">Response:</span>{" "}
                      {req.response_reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
