"use client";

import { motion } from "framer-motion";
import { CheckCircle, X, XCircle } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onShortlistSelected: () => void;
  onRejectSelected: () => void;
  onClearSelection: () => void;
  loading?: boolean;
}

export function BulkActionBar({
  selectedCount,
  onShortlistSelected,
  onRejectSelected,
  onClearSelection,
  loading = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
    >
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-xl">
        <span className="text-sm font-semibold tabular-nums text-slate-900">
          {selectedCount} selected
        </span>

        <div className="h-5 w-px bg-gray-200" />

        <button
          type="button"
          onClick={onShortlistSelected}
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors duration-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Shortlist
        </button>

        <button
          type="button"
          onClick={onRejectSelected}
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors duration-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircle className="h-3.5 w-3.5" />
          Reject
        </button>

        <button
          type="button"
          onClick={onClearSelection}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>
    </motion.div>
  );
}
