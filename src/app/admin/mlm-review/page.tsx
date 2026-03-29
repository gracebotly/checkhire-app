"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";

type MlmListing = {
  id: string;
  title: string;
  slug: string;
  description: string;
  mlm_flag_score: number;
  employer_id: string;
  created_at: string;
  employers: { company_name: string; slug: string } | null;
};

export default function AdminMlmReviewPage() {
  const [listings, setListings] = useState<MlmListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/listings/review")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setListings(data.listings || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleModerate(listingId: string, action: "approve" | "reject") {
    setActionLoading(listingId);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.ok) {
        setListings((prev) => prev.filter((l) => l.id !== listingId));
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900">MLM Review Queue</h1>
      <p className="mt-1 text-sm text-slate-600">
        Listings flagged by the MLM keyword detection system. Review and approve or reject.
      </p>

      {listings.length === 0 ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-2 text-sm text-slate-600">No listings pending MLM review.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {listings.map((listing, i) => {
            const emp = Array.isArray(listing.employers) ? listing.employers[0] : listing.employers;
            return (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04, ease: "easeOut" }}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-slate-900">{listing.title}</h3>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {emp?.company_name ?? "Unknown company"} · MLM score: {listing.mlm_flag_score}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {listing.description.length > 400
                        ? listing.description.slice(0, 400) + "..."
                        : listing.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleModerate(listing.id, "approve")}
                      disabled={actionLoading === listing.id}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors duration-200 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleModerate(listing.id, "reject")}
                      disabled={actionLoading === listing.id}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors duration-200 hover:bg-red-100 disabled:opacity-50"
                    >
                      <XCircle className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
