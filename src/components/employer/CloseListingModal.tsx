"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, AlertTriangle, Loader2 } from "lucide-react";

const CLOSE_REASONS = [
  { value: "filled", label: "Position filled" },
  { value: "budget_cut", label: "Budget cut" },
  { value: "role_eliminated", label: "Role eliminated" },
  { value: "hired_internally", label: "Hired internally" },
  { value: "position_restructured", label: "Position restructured" },
  { value: "insufficient_candidates", label: "Insufficient qualified candidates" },
  { value: "other", label: "Other" },
];

interface CloseListingModalProps {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
  onClosed: (newStatus: string) => void;
}

export function CloseListingModal({
  listingId,
  listingTitle,
  onClose,
  onClosed,
}: CloseListingModalProps) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [markAsFilled, setMarkAsFilled] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason) {
      setError("Please select a reason.");
      return;
    }

    setClosing(true);
    setError(null);

    try {
      const res = await fetch(`/api/employer/listings/${listingId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          close_reason: reason,
          status: markAsFilled ? "filled" : "closed",
          close_reason_detail: reason === "other" ? detail : undefined,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        onClosed(data.status);
      } else {
        setError(data.message || "Failed to close listing.");
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setClosing(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-semibold text-slate-900">Close Listing</h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors duration-200 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-slate-600">
            You&apos;re closing <span className="font-medium text-slate-900">&quot;{listingTitle}&quot;</span>.
            This listing will no longer accept applications.
          </p>

          {/* Reason dropdown */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Why are you closing this listing? (required)
            </label>
            <select
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
                // Auto-check "filled" if they select "filled" reason
                if (e.target.value === "filled") setMarkAsFilled(true);
              }}
              className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Select a reason</option>
              {CLOSE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Other detail */}
          {reason === "other" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Please explain (optional)
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Why are you closing this listing?"
                rows={3}
                maxLength={500}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          )}

          {/* Mark as filled checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="mark-filled"
              checked={markAsFilled}
              onChange={(e) => setMarkAsFilled(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-gray-200 text-brand focus:ring-brand/20"
            />
            <label htmlFor="mark-filled" className="cursor-pointer text-sm text-slate-900">
              Mark as filled (position was hired)
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={closing || !reason}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {closing && <Loader2 className="h-4 w-4 animate-spin" />}
            {closing ? "Closing..." : "Close Listing"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
