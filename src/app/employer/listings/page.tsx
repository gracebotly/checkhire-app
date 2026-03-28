"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Briefcase,
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  PauseCircle,
  AlertTriangle,
  Play,
  Pause,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { DaysRemaining } from "@/components/jobs/DaysRemaining";
import { CloseListingModal } from "@/components/employer/CloseListingModal";

type Listing = {
  id: string;
  title: string;
  category: string | null;
  status: string;
  slug: string;
  pay_type: string;
  salary_min: number | null;
  salary_max: number | null;
  remote_type: string;
  current_application_count: number;
  max_applications: number;
  created_at: string;
  expires_at: string;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle2; color: string; bg: string }
> = {
  active: {
    label: "Active",
    icon: CheckCircle2,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  review_pending: {
    label: "In Review",
    icon: AlertTriangle,
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  paused: {
    label: "Paused",
    icon: PauseCircle,
    color: "text-slate-700",
    bg: "bg-slate-50",
  },
  closed: {
    label: "Closed",
    icon: Clock,
    color: "text-slate-600",
    bg: "bg-gray-50",
  },
  filled: {
    label: "Filled",
    icon: CheckCircle2,
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  expired: {
    label: "Expired",
    icon: Clock,
    color: "text-red-700",
    bg: "bg-red-50",
  },
};

export default function EmployerListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [closeTarget, setCloseTarget] = useState<Listing | null>(null);
  const searchParams = useSearchParams();
  const justCreated = searchParams.get("created");

  const loadListings = async () => {
    try {
      const res = await fetch("/api/employer/listings");
      const json = await res.json();
      if (json.ok) setListings(json.listings || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    loadListings();
  }, []);

  const handlePauseToggle = async (listing: Listing) => {
    const newStatus = listing.status === "active" ? "paused" : "active";
    setActionLoading(listing.id);
    try {
      const res = await fetch(`/api/employer/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        setListings((prev) =>
          prev.map((l) => (l.id === listing.id ? { ...l, status: newStatus } : l))
        );
      }
    } catch {
      /* ignore */
    }
    setActionLoading(null);
  };

  const handleClosed = (newStatus: string) => {
    if (closeTarget) {
      setListings((prev) =>
        prev.map((l) =>
          l.id === closeTarget.id ? { ...l, status: newStatus } : l
        )
      );
    }
    setCloseTarget(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader title="My Listings" subtitle="Manage your job postings." />
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader title="My Listings" subtitle="Manage your job postings." />

      <div className="mx-auto max-w-6xl px-6 py-6">
        {justCreated && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">
              Listing created successfully!
            </p>
          </motion.div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {listings.length} listing{listings.length !== 1 ? "s" : ""}
          </p>
          <Link
            href="/employer/listings/new"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
          >
            <Plus className="h-4 w-4" /> New Listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-muted">
              <Briefcase className="h-7 w-7 text-brand" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              No listings yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Post your first job listing to start receiving verified,
              pseudonymous applications from qualified candidates.
            </p>
            <Link
              href="/employer/listings/new"
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
            >
              <Plus className="h-4 w-4" /> Create Your First Listing
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {listings.map((listing, index) => {
              const statusInfo =
                STATUS_CONFIG[listing.status] || STATUS_CONFIG.closed;
              const StatusIcon = statusInfo.icon;
              const isActionable = ["active", "paused"].includes(listing.status);
              const isLoadingThis = actionLoading === listing.id;

              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: index * 0.04,
                    ease: "easeOut",
                  }}
                  className="rounded-xl border border-gray-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-slate-900">
                        {listing.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        {listing.category && <span>{listing.category}</span>}
                        <span>
                          {listing.remote_type.replace("_", " ")}
                        </span>
                        <span>{listing.pay_type}</span>
                        {listing.salary_min != null &&
                          listing.salary_max != null && (
                            <span className="tabular-nums">
                              ${listing.salary_min.toLocaleString()} –
                              ${listing.salary_max.toLocaleString()}
                            </span>
                          )}
                      </div>
                    </div>
                    <div
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.color} ${statusInfo.bg}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusInfo.label}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <DaysRemaining expiresAt={listing.expires_at} />
                      <span className="tabular-nums">
                        {listing.current_application_count}/
                        {listing.max_applications} applications
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Pause / Unpause */}
                      {isActionable && (
                        <button
                          onClick={() => handlePauseToggle(listing)}
                          disabled={isLoadingThis}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isLoadingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : listing.status === "active" ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                          {listing.status === "active" ? "Pause" : "Resume"}
                        </button>
                      )}

                      {/* Close */}
                      {isActionable && (
                        <button
                          onClick={() => setCloseTarget(listing)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors duration-200 hover:bg-red-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Close
                        </button>
                      )}

                      {/* View */}
                      <Link
                        href={`/jobs/${listing.slug}`}
                        className="cursor-pointer text-xs font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Close listing modal */}
      {closeTarget && (
        <CloseListingModal
          listingId={closeTarget.id}
          listingTitle={closeTarget.title}
          onClose={() => setCloseTarget(null)}
          onClosed={handleClosed}
        />
      )}
    </div>
  );
}
