"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import type { FlagReason } from "@/types/database";

const EMPLOYER_REASONS: { value: FlagReason; label: string }[] = [
  { value: "impersonation", label: "Impersonating another company" },
  { value: "data_harvesting", label: "Suspected data harvesting" },
  { value: "ghost_job", label: "Posts ghost jobs — never hires" },
  { value: "bait_and_switch", label: "Bait and switch tactics" },
  { value: "mlm_suspected", label: "Suspected MLM / network marketing" },
  { value: "other", label: "Other" },
];

interface ReportEmployerButtonProps {
  employerId: string;
}

export function ReportEmployerButton({ employerId }: ReportEmployerButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FlagReason | "">("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: "employer",
          target_id: employerId,
          reason,
          description: description.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to submit report.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => {
      setReason("");
      setDescription("");
      setSubmitted(false);
      setError(null);
      setSubmitting(false);
    }, 200);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600 transition-colors duration-200 hover:text-red-600"
        >
          <Flag className="h-3.5 w-3.5" />
          Report this company
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg"
          >
            {submitted ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">Report submitted</p>
                <p className="mt-1 text-sm text-slate-600">
                  Thank you. Our team will review this company.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-4 cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <Dialog.Title className="text-base font-semibold text-slate-900">
                  Report company
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-slate-600">
                  Help us maintain trust. Select a reason for your report.
                </Dialog.Description>

                <div className="mt-4 space-y-2">
                  {EMPLOYER_REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors duration-200 ${
                        reason === r.value
                          ? "border-brand bg-brand-muted text-slate-900"
                          : "border-gray-200 text-slate-600 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="sr-only"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Add details (optional)..."
                  className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />

                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

                <div className="mt-4 flex justify-end gap-3">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!reason || submitting}
                    className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit report"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
