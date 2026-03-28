"use client";

import { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteWorkspaceModalProps {
  onClose: () => void;
  onDeleted: () => void;
}

const CONFIRMATION_TEXT = "DEACTIVATE MY ACCOUNT";

export function DeleteWorkspaceModal({
  onClose,
  onDeleted,
}: DeleteWorkspaceModalProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  void onDeleted;

  const isConfirmed = confirmInput === CONFIRMATION_TEXT;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setDeleting(true);
    setError(null);

    try {
      // Note: The /api/employer/danger endpoint does not exist yet.
      // This will be wired when account deactivation is built.
      // For now the button is non-functional — users see a "coming soon" message.
      setError("Account deactivation is not yet available. Please contact support@checkhire.com.");
      setDeleting(false);
    } catch {
      setError("Network error. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900">
              Deactivate Company Account
            </h2>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-slate-600 transition-colors duration-200 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              Your company account will be deactivated immediately.
            </p>
            <p className="mt-1 text-sm text-red-700">
              All active job listings will be closed, team members will lose
              access, and your employer profile will be hidden. Data is
              permanently removed after a 30-day grace period.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900">
              Type{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-red-600">
                {CONFIRMATION_TEXT}
              </code>{" "}
              to confirm:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={CONFIRMATION_TEXT}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-600 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
              autoComplete="off"
              spellCheck={false}
            />
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
            onClick={handleDelete}
            disabled={!isConfirmed || deleting}
            className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Processing...
              </span>
            ) : (
              "Deactivate Account"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
