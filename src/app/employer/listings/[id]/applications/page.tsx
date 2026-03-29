"use client";

import { CandidateCard } from "@/components/employer/CandidateCard";
import { KanbanBoard } from "@/components/employer/KanbanBoard";
import { PipelineViewToggle } from "@/components/employer/PipelineViewToggle";
import { BulkActionBar } from "@/components/employer/BulkActionBar";
import { RejectionTemplateModal } from "@/components/employer/RejectionTemplateModal";
import { PageHeader } from "@/components/layout/page-header";
import { useLocalStorageBoolean } from "@/lib/use-local-storage";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckSquare,
  Loader2,
  SortAsc,
  Users,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import type { CandidateView } from "@/types/database";

export default function EmployerApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: listingId } = use(params);
  const [candidates, setCandidates] = useState<CandidateView[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [error, setError] = useState<string | null>(null);
  const [isKanban, setIsKanban] = useLocalStorageBoolean("checkhire_pipeline_view_kanban", true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCandidates() {
      setError(null);
      try {
        const params = new URLSearchParams({ listing_id: listingId, sort: sortBy });
        if (statusFilter !== "all") params.set("status", statusFilter);
        const res = await fetch(`/api/employer/applications?${params}`);
        const data = await res.json();
        if (cancelled) return;

        if (data.ok) {
          setCandidates(data.candidates || []);
        } else {
          setError(data.message || "Failed to load applications.");
        }
      } catch {
        if (!cancelled) setError("Network error.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCandidates();
    return () => { cancelled = true; };
  }, [listingId, statusFilter, sortBy]);

  const handleStatusChange = useCallback(
    async (applicationId: string, newStatus: string) => {
      const res = await fetch(`/api/employer/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.application_id === applicationId
              ? { ...c, status: newStatus as CandidateView["status"] }
              : c
          )
        );
      }
    },
    []
  );

  const handleSelectToggle = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleBulkShortlist = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/employer/applications/bulk-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_ids: Array.from(selectedIds),
          status: "shortlisted",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCandidates((prev) =>
          prev.map((c) =>
            selectedIds.has(c.application_id)
              ? { ...c, status: "shortlisted" as const }
              : c
          )
        );
        setSelectedIds(new Set());
        setSelectionMode(false);
      }
    } catch {}
    setBulkLoading(false);
  }, [selectedIds]);

  const handleBulkReject = useCallback(
    async (message: string) => {
      if (selectedIds.size === 0) return;
      setBulkLoading(true);
      setShowRejectModal(false);
      try {
        const res = await fetch("/api/employer/applications/bulk-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            application_ids: Array.from(selectedIds),
            status: "rejected",
            rejection_message: message,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          setCandidates((prev) =>
            prev.map((c) =>
              selectedIds.has(c.application_id)
                ? { ...c, status: "rejected" as const }
                : c
          )
          );
          setSelectedIds(new Set());
          setSelectionMode(false);
        }
      } catch {}
      setBulkLoading(false);
    },
    [selectedIds]
  );

  const handleViewChange = useCallback(
    (view: "kanban" | "list") => {
      setIsKanban(view === "kanban");
    },
    [setIsKanban]
  );

  const FILTER_OPTIONS = [
    { value: "all", label: "All" },
    { value: "applied", label: "New" },
    { value: "reviewed", label: "Reviewed" },
    { value: "shortlisted", label: "Shortlisted" },
    { value: "interview_requested", label: "Interview Sent" },
    { value: "interview_accepted", label: "Interviewing" },
    { value: "offered", label: "Offered" },
    { value: "hired", label: "Hired" },
    { value: "rejected", label: "Rejected" },
    { value: "withdrawn", label: "Withdrawn" },
  ];

  const newCount = candidates.filter((c) => c.status === "applied").length;

  const handleMarkAllReviewed = useCallback(async () => {
    const newApps = candidates.filter((c) => c.status === "applied");
    if (newApps.length === 0) return;
    const ids = newApps.map((c) => c.application_id);
    try {
      const res = await fetch("/api/employer/applications/bulk-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_ids: ids, status: "reviewed" }),
      });
      const data = await res.json();
      if (data.ok) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.status === "applied" ? { ...c, status: "reviewed" } : c
          )
        );
      }
    } catch { /* ignore */ }
  }, [candidates]);

  const SORT_OPTIONS = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "score_desc", label: "Highest Score" },
  ];

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Applications"
        subtitle={`${candidates.length} candidate${candidates.length !== 1 ? "s" : ""}`}
      />
      <div className="mx-auto max-w-7xl px-6 py-6">
        <Link
          href="/employer/listings"
          className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to listings
        </Link>

        {/* Toolbar */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PipelineViewToggle
              view={isKanban ? "kanban" : "list"}
              onViewChange={handleViewChange}
            />
            <button
              type="button"
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) setSelectedIds(new Set());
              }}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                selectionMode
                  ? "border-brand bg-brand-muted text-brand"
                  : "border-gray-200 bg-white text-slate-600 hover:bg-gray-50"
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {selectionMode ? "Cancel Select" : "Select"}
            </button>
            {newCount > 0 && statusFilter === "all" && (
              <button
                onClick={handleMarkAllReviewed}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700 transition-colors duration-200 hover:bg-cyan-100"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Mark {newCount} new application{newCount !== 1 ? "s" : ""} as reviewed
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort dropdown — shown in both views */}
            <div className="flex items-center gap-1.5">
              <SortAsc className="h-3.5 w-3.5 text-slate-600" />
              <select
                value={sortBy}
                onChange={(e) => { setLoading(true); setSortBy(e.target.value); }}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Status filter tabs — shown in list view only */}
        {!isKanban && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setLoading(true); setStatusFilter(opt.value); }}
                className={`shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                  statusFilter === opt.value
                    ? "bg-brand text-white"
                    : "bg-gray-50 text-slate-600 hover:bg-gray-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
          </div>
        ) : error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
            {error}
          </div>
        ) : candidates.length === 0 ? (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-muted">
              <Users className="h-4 w-4 text-brand" />
            </div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              No applications yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Candidates who apply will appear here with pseudonymous profiles.
            </p>
          </div>
        ) : isKanban ? (
          <div className="mt-4">
            <KanbanBoard
              candidates={candidates}
              onStatusChange={handleStatusChange}
              selectedIds={selectedIds}
              onSelectToggle={handleSelectToggle}
              selectionMode={selectionMode}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {candidates.map((candidate, index) => (
              <motion.div
                key={candidate.application_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
                className="flex items-start gap-3"
              >
                {selectionMode && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(candidate.application_id)}
                    onChange={(e) => handleSelectToggle(candidate.application_id, e.target.checked)}
                    className="mt-6 h-4 w-4 cursor-pointer rounded border-gray-200 text-brand focus:ring-brand/20"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <CandidateCard
                    candidate={candidate}
                    onStatusChange={handleStatusChange}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectionMode && selectedIds.size > 0 && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            onShortlistSelected={handleBulkShortlist}
            onRejectSelected={() => setShowRejectModal(true)}
            onClearSelection={() => setSelectedIds(new Set())}
            loading={bulkLoading}
          />
        )}
      </AnimatePresence>

      {/* Rejection template modal */}
      {showRejectModal && (
        <RejectionTemplateModal
          selectedCount={selectedIds.size}
          onConfirm={handleBulkReject}
          onClose={() => setShowRejectModal(false)}
        />
      )}
    </div>
  );
}
