"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { DeleteWorkspaceModal } from "@/components/settings/DeleteWorkspaceModal";

export function DangerTab() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleted = () => {
    window.location.href = "/login";
  };

  return (
    <div className="space-y-6">
      {/* Warning banner */}
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <p className="text-sm font-medium text-red-800">
          This section contains irreversible actions. Please proceed with caution.
        </p>
      </div>

      {/* Deactivate Company Account */}
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <h3 className="text-base font-semibold text-red-900">
          Deactivate Company Account
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Your company account will be deactivated immediately. All active job
          listings will be closed, team members will lose access, and your
          employer profile will be hidden from job seekers. You can contact
          support to restore within a 30-day grace period.
        </p>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700"
        >
          <Trash2 className="h-4 w-4" />
          Deactivate Account
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <DeleteWorkspaceModal
          onClose={() => setShowDeleteModal(false)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
