"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { KanbanCard } from "./KanbanCard";
import type { CandidateView, ApplicationStatus } from "@/types/database";

const COLUMNS: { status: ApplicationStatus; label: string; color: string }[] = [
  { status: "applied", label: "New", color: "border-t-blue-400" },
  { status: "reviewed", label: "Reviewed", color: "border-t-cyan-400" },
  { status: "shortlisted", label: "Shortlisted", color: "border-t-emerald-400" },
  { status: "interview_requested", label: "Interview Sent", color: "border-t-amber-400" },
  { status: "interview_accepted", label: "Interviewing", color: "border-t-brand" },
  { status: "offered", label: "Offered", color: "border-t-emerald-500" },
  { status: "hired", label: "Hired", color: "border-t-emerald-600" },
  { status: "rejected", label: "Rejected", color: "border-t-gray-400" },
];

const VALID_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewed", "shortlisted", "rejected"],
  reviewed: ["shortlisted", "interview_requested", "rejected"],
  shortlisted: ["interview_requested", "rejected"],
  interview_requested: ["rejected"],
  interview_accepted: ["offered", "rejected"],
  offered: ["hired", "rejected"],
};

interface KanbanBoardProps {
  candidates: CandidateView[];
  onStatusChange: (applicationId: string, newStatus: string) => Promise<void>;
  selectedIds: Set<string>;
  onSelectToggle: (id: string, selected: boolean) => void;
  selectionMode: boolean;
}

export function KanbanBoard({
  candidates,
  onStatusChange,
  selectedIds,
  onSelectToggle,
  selectionMode,
}: KanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const showToast = useCallback((message: string, type: "error" | "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleDrop = useCallback(
    async (targetStatus: string, e: React.DragEvent) => {
      e.preventDefault();
      setDragOverColumn(null);

      const appId = e.dataTransfer.getData("application/checkhire-app-id");
      const fromStatus = e.dataTransfer.getData("application/checkhire-status");

      if (!appId || !fromStatus) return;
      if (fromStatus === targetStatus) return;

      // Validate transition client-side before calling API
      const allowed = VALID_TRANSITIONS[fromStatus];
      if (!allowed || !allowed.includes(targetStatus)) {
        showToast(`Cannot move from "${fromStatus.replace(/_/g, " ")}" to "${targetStatus.replace(/_/g, " ")}"`, "error");
        return;
      }

      try {
        await onStatusChange(appId, targetStatus);
        showToast("Candidate moved successfully", "success");
      } catch {
        showToast("Failed to update status", "error");
      }
    },
    [onStatusChange, showToast]
  );

  const handleDragOver = useCallback((status: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  return (
    <div className="relative">
      {/* Toast notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg ${
            toast.type === "error"
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {toast.message}
        </motion.div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colCandidates = candidates.filter((c) => c.status === col.status);
          const isDropTarget = dragOverColumn === col.status;

          return (
            <div
              key={col.status}
              className={`w-56 shrink-0 rounded-xl border-t-2 bg-gray-50 ${col.color} ${
                isDropTarget ? "ring-2 ring-brand/30" : ""
              }`}
              onDragOver={(e) => handleDragOver(col.status, e)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(col.status, e)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-xs font-semibold text-slate-900">{col.label}</span>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-semibold tabular-nums text-slate-600 border border-gray-200">
                  {colCandidates.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2 px-2 pb-3" style={{ minHeight: "80px" }}>
                {colCandidates.length === 0 && (
                  <div className={`rounded-lg border border-dashed py-6 text-center text-[10px] text-slate-600 ${
                    isDropTarget ? "border-brand bg-brand-muted" : "border-gray-300"
                  }`}>
                    {isDropTarget ? "Drop here" : "No candidates"}
                  </div>
                )}
                {colCandidates.map((candidate) => (
                  <KanbanCard
                    key={candidate.application_id}
                    candidate={candidate}
                    selected={selectedIds.has(candidate.application_id)}
                    onSelect={onSelectToggle}
                    selectionMode={selectionMode}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
