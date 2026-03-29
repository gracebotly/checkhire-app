"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Loader2, Trash2, AlertTriangle, Shield, Clock } from "lucide-react";

export function DataControlsCard() {
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/seeker/data-export");
      if (!res.ok) {
        throw new Error("Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `checkhire-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export data. Please try again.");
    }
    setExporting(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/seeker/data-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE_MY_DATA" }),
      });
      const data = await res.json();

      if (data.ok) {
        setDeleteResult(data.message);
        setShowDeleteConfirm(false);
      } else {
        setDeleteError(data.message || "Failed to delete data.");
      }
    } catch {
      setDeleteError("Network error. Please try again.");
    }

    setDeleting(false);
  };

  if (deleteResult) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
            <Shield className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Data Deleted</h3>
            <p className="mt-1 text-sm text-slate-600">{deleteResult}</p>
            <a
              href="/login"
              className="mt-3 inline-flex cursor-pointer items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-hover"
            >
              Sign Out
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Data info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-900">Your Data on CheckHire</h3>
        <p className="mt-2 text-sm text-slate-600">
          You have full control over your data. You can export everything we have or permanently delete your account.
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="h-3 w-3 shrink-0" />
            Resumes are deleted 90 days after a listing closes
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="h-3 w-3 shrink-0" />
            Video applications are deleted 90 days after a listing closes
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="h-3 w-3 shrink-0" />
            Application records are anonymized after 1 year
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="h-3 w-3 shrink-0" />
            Chat messages are deleted 1 year after last message
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-900">Export My Data</h3>
        <p className="mt-1 text-xs text-slate-600">
          Download a JSON file containing your profile, applications, screening responses, and messages.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-colors duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? "Preparing..." : "Download My Data"}
        </button>
      </div>

      {/* Delete */}
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-red-900">Delete My Account</h3>
        <p className="mt-1 text-xs text-slate-600">
          Permanently delete your profile, withdraw all active applications, and remove all uploaded files.
          This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete My Account
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-3 space-y-3 rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">Are you absolutely sure?</p>
                <p className="mt-1 text-xs text-red-700">
                  This will permanently delete your profile, withdraw all active applications, remove your
                  resume and video files, and anonymize your records. You will not be able to recover this data.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-700">
                {deleteError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {deleting ? "Deleting..." : "Yes, Delete Everything"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
