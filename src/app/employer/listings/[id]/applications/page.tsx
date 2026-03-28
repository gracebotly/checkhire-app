"use client";

import { CandidateCard } from "@/components/employer/CandidateCard";
import { PageHeader } from "@/components/layout/page-header";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCandidates() {
      setError(null);
      try {
        const url = `/api/employer/applications?listing_id=${listingId}${
          statusFilter !== "all" ? `&status=${statusFilter}` : ""
        }`;
        const res = await fetch(url);
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
    return () => {
      cancelled = true;
    };
  }, [listingId, statusFilter]);

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    try {
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
    } catch {
      /* ignore */
    }
  };

  const FILTER_OPTIONS = [
    { value: "all", label: "All" },
    { value: "applied", label: "New" },
    { value: "reviewed", label: "Reviewed" },
    { value: "shortlisted", label: "Shortlisted" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Applications"
        subtitle={`${candidates.length} candidate${candidates.length !== 1 ? "s" : ""}`}
      />
      <div className="mx-auto max-w-6xl px-6 py-6">
        <Link
          href="/employer/listings"
          className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to listings
        </Link>

        <div className="mt-2 flex items-center gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setLoading(true); setStatusFilter(opt.value); }}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                statusFilter === opt.value
                  ? "bg-brand text-white"
                  : "bg-gray-50 text-slate-600 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

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
        ) : (
          <div className="mt-4 space-y-3">
            {candidates.map((candidate, index) => (
              <motion.div
                key={candidate.application_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
              >
                <CandidateCard
                  candidate={candidate}
                  onStatusChange={handleStatusChange}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
