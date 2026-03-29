"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CandidateCard } from "@/components/employer/CandidateCard";
import { motion } from "framer-motion";
import { Loader2, Users, Filter, Search } from "lucide-react";
import Link from "next/link";
import type { CandidateView } from "@/types/database";

type ListingSummary = {
  id: string;
  title: string;
  slug: string;
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "applied", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview_requested", label: "Interview Sent" },
  { value: "interview_accepted", label: "Interviewing" },
  { value: "offered", label: "Offered" },
  { value: "hired", label: "Hired" },
];

export default function EmployerApplicationsPage() {
  const [candidates, setCandidates] = useState<
    (CandidateView & { listing_title?: string; listing_id?: string })[]
  >([]);
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [listingFilter, setListingFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Fetch all listings to get IDs and titles
        const listingsRes = await fetch("/api/employer/listings");
        const listingsData = await listingsRes.json();
        if (!active || !listingsData.ok) return;

        const allListings: ListingSummary[] = (listingsData.listings || []).map(
          (l: { id: string; title: string; slug: string }) => ({
            id: l.id,
            title: l.title,
            slug: l.slug,
          })
        );
        setListings(allListings);

        // Fetch applications for each listing
        const allCandidates: (CandidateView & {
          listing_title?: string;
          listing_id?: string;
        })[] = [];

        for (const listing of allListings) {
          const params = new URLSearchParams({ listing_id: listing.id });
          const res = await fetch(`/api/employer/applications?${params}`);
          const data = await res.json();
          if (data.ok && data.candidates) {
            for (const c of data.candidates) {
              allCandidates.push({
                ...c,
                listing_title: listing.title,
                listing_id: listing.id,
              });
            }
          }
        }

        if (active) {
          // Sort by newest first
          allCandidates.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
          setCandidates(allCandidates);
        }
      } catch {
        /* ignore */
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
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
  };

  // Filter
  const filtered = candidates.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (listingFilter !== "all" && c.listing_id !== listingFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPseudonym = c.pseudonym.toLowerCase().includes(q);
      const matchName =
        c.first_name?.toLowerCase().includes(q) ||
        c.full_name?.toLowerCase().includes(q);
      const matchSkills = c.skills?.some((s) => s.toLowerCase().includes(q));
      if (!matchPseudonym && !matchName && !matchSkills) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="All Applications"
          subtitle="Review candidates across all your listings."
        />
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans">
      <PageHeader
        title="All Applications"
        subtitle="Review candidates across all your listings."
      />

      <div className="mx-auto max-w-6xl px-6 py-6">
        {candidates.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
              <Users className="h-7 w-7 text-blue-600" />
            </div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              No applications yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Applications will appear here once job seekers start applying to
              your listings.
            </p>
            <Link
              href="/employer/listings"
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
            >
              View Listings
            </Link>
          </div>
        ) : (
          <>
            {/* Filters bar */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {/* Status filter */}
                <div className="flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-slate-600" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    {STATUS_FILTERS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Listing filter */}
                {listings.length > 1 && (
                  <select
                    value={listingFilter}
                    onChange={(e) => setListingFilter(e.target.value)}
                    className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="all">All listings</option>
                    {listings.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  type="text"
                  placeholder="Search by name, pseudonym, or skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 sm:w-72"
                />
              </div>
            </div>

            {/* Results count */}
            <p className="mb-4 text-sm text-slate-600">
              {filtered.length} of {candidates.length} application
              {candidates.length !== 1 ? "s" : ""}
              {statusFilter !== "all" &&
                ` (${statusFilter.replace(/_/g, " ")})`}
            </p>

            {/* Candidate cards */}
            <div className="space-y-4">
              {filtered.map((candidate, index) => (
                <motion.div
                  key={candidate.application_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min(index * 0.04, 0.4),
                    ease: "easeOut",
                  }}
                >
                  {candidate.listing_title && (
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="text-xs font-medium text-slate-600">
                        {candidate.listing_title}
                      </span>
                    </div>
                  )}
                  <CandidateCard
                    candidate={candidate}
                    onStatusChange={handleStatusChange}
                  />
                </motion.div>
              ))}
            </div>

            {filtered.length === 0 && candidates.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
                <p className="text-sm text-slate-600">
                  No applications match your current filters.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
