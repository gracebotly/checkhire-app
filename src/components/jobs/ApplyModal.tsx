"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, Shield, X } from "lucide-react";
import { useState } from "react";
import { ScreeningQuiz } from "./ScreeningQuiz";
import type { ScreeningQuestion } from "@/types/database";

interface ApplyModalProps {
  listingId: string;
  listingTitle: string;
  requiresScreeningQuiz: boolean;
  screeningQuestions: ScreeningQuestion[];
  onClose: () => void;
  onSuccess: (pseudonym: string) => void;
}

export function ApplyModal({
  listingId,
  listingTitle,
  requiresScreeningQuiz,
  screeningQuestions,
  onClose,
  onSuccess,
}: ApplyModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ pseudonym: string } | null>(null);
  const [responses, setResponses] = useState<Record<string, unknown>>({});

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_listing_id: listingId,
          screening_responses: requiresScreeningQuiz ? responses : undefined,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.message || "Failed to submit application.");
        setSubmitting(false);
        return;
      }

      setSuccess({ pseudonym: data.application.pseudonym });
      setTimeout(() => onSuccess(data.application.pseudonym), 2500);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={success ? undefined : onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative z-10 mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              {success ? "Application Submitted" : "Apply to this role"}
            </h2>
            {!success && <p className="mt-0.5 text-xs text-slate-600">{listingTitle}</p>}
          </div>
          {!success && (
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-slate-600 transition-colors duration-200 hover:bg-gray-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="px-6 py-5 font-sans">
          {success ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">
                You&apos;re in!
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Your pseudonym for this application is:
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-muted px-4 py-2">
                <Shield className="h-4 w-4 text-brand" />
                <span className="text-base font-bold text-brand">{success.pseudonym}</span>
              </div>
              <p className="mt-4 max-w-xs text-xs text-slate-600">
                The employer will see you as &ldquo;{success.pseudonym}&rdquo; —
                your real name is hidden until you advance in the hiring process.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-start gap-3 rounded-lg bg-brand-muted p-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <p className="text-xs text-slate-900">
                  You&apos;ll apply with a random pseudonym. The employer will see
                  your skills, experience, and screening answers — but not your
                  name, email, or resume file.
                </p>
              </div>

              {requiresScreeningQuiz && screeningQuestions.length > 0 && (
                <div className="mb-5">
                  <h3 className="mb-3 font-display text-sm font-semibold text-slate-900">
                    Screening Questions
                  </h3>
                  <ScreeningQuiz
                    questions={screeningQuestions}
                    responses={responses}
                    onChange={setResponses}
                  />
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full cursor-pointer bg-brand text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
