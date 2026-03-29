"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface CheckinFormProps {
  checkinId: string;
  checkinType: string;
  listingTitle: string;
  companyName: string;
  showGotPaid: boolean;
}

export function CheckinForm({
  checkinId,
  checkinType,
  listingTitle,
  companyName,
  showGotPaid,
}: CheckinFormProps) {
  const [heardBack, setHeardBack] = useState<boolean | null>(null);
  const [jobWasReal, setJobWasReal] = useState<boolean | null>(null);
  const [gotPaid, setGotPaid] = useState<boolean | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayLabel = checkinType === "30day" ? "30" : "60";
  const canSubmit =
    heardBack !== null && jobWasReal !== null && rating > 0 && (!showGotPaid || gotPaid !== null);

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/checkins/${checkinId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heard_back: heardBack,
          job_was_real: jobWasReal,
          got_paid: showGotPaid ? gotPaid : null,
          rating,
          comments: comments.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-gray-200 bg-white p-8 text-center"
      >
        <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Thank you!</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your feedback helps keep CheckHire trustworthy for all job seekers.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          {dayLabel}-Day Check-In
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          How&apos;s your role as <span className="font-medium text-slate-900">{listingTitle}</span>{" "}
          at <span className="font-medium text-slate-900">{companyName}</span>?
        </p>
      </div>

      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
        {/* Question 1: Heard back */}
        <YesNoQuestion
          label="Did the employer communicate with you as expected?"
          value={heardBack}
          onChange={setHeardBack}
        />

        {/* Question 2: Job was real */}
        <YesNoQuestion
          label="Is the job as described in the listing?"
          value={jobWasReal}
          onChange={setJobWasReal}
        />

        {/* Question 3: Got paid (gig/temp only) */}
        {showGotPaid && (
          <YesNoQuestion
            label="Have you been paid as agreed?"
            value={gotPaid}
            onChange={setGotPaid}
          />
        )}

        {/* Rating */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-900">
            Overall, how would you rate this employer?
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition-colors duration-200 ${
                  rating >= n
                    ? "border-brand bg-brand text-white"
                    : "border-gray-200 bg-white text-slate-600 hover:border-gray-300"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div>
          <label htmlFor="comments" className="mb-1 block text-sm font-medium text-slate-900">
            Anything else you&apos;d like to share? <span className="text-slate-600">(optional)</span>
          </label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Your feedback is anonymous to the employer..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Warning if negative */}
        {(jobWasReal === false || gotPaid === false) && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <p className="text-sm text-slate-900">
              We take this seriously. Your response will flag this employer for review by our trust
              team.
            </p>
          </div>
        )}

        {/* Error */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full cursor-pointer rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Check-In"}
        </button>
      </div>
    </motion.div>
  );
}

function YesNoQuestion({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-900">{label}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            value === true
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-gray-200 bg-white text-slate-600 hover:border-gray-300"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            value === false
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-gray-200 bg-white text-slate-600 hover:border-gray-300"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}
