"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ConversationThread } from "@/components/gig/ConversationThread";
import type { DealInterest } from "@/types/database";

type Props = {
  dealId: string;
  existingInterest: DealInterest | null;
  onSubmitted: () => void;
  currentUserId: string;
};

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "danger" }
> = {
  pending: { label: "Pending Review", variant: "warning" },
  in_conversation: { label: "In Conversation", variant: "default" },
  accepted: { label: "Accepted", variant: "success" },
  rejected: { label: "Not Selected", variant: "default" },
  withdrawn: { label: "Withdrawn", variant: "default" },
};

export function InterestForm({
  dealId,
  existingInterest,
  onSubmitted,
  currentUserId,
}: Props) {
  const [pitch, setPitch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (existingInterest) {
    const statusInfo = statusLabels[existingInterest.status] || statusLabels.pending;
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Your Pitch</h3>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-600">{existingInterest.pitch_text}</p>

        {(existingInterest.status === "pending" ||
          existingInterest.status === "in_conversation" ||
          existingInterest.status === "accepted") &&
          currentUserId && (
            <div className="mt-4">
              <ConversationThread
                dealId={dealId}
                interestId={existingInterest.id}
                currentUserId={currentUserId}
                threadClosed={false}
              />
            </div>
          )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
        <CheckCircle className="mx-auto h-8 w-8 text-brand" />
        <p className="mt-2 text-sm font-semibold text-slate-900">Interest submitted!</p>
        <p className="mt-1 text-xs text-slate-600">
          The client will review your pitch and get back to you.
        </p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (pitch.trim().length < 20) {
      setError("Pitch must be at least 20 characters");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/deals/${dealId}/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch_text: pitch.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setSubmitted(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit interest");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">Interested in this gig?</h3>
      <p className="mt-1 text-xs text-slate-600">
        Write a short pitch explaining why you&apos;re a good fit.
      </p>

      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}

      <textarea
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        placeholder="Why are you a good fit? Mention relevant experience..."
        maxLength={500}
        rows={4}
        className="mt-3 flex w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
      <div className="mt-1 flex items-center justify-between">
        <span
          className={`text-xs ${
            pitch.length > 500 ? "text-red-600" : "text-slate-600"
          }`}
        >
          {pitch.length}/500
        </span>
        <span className="text-xs text-slate-600">Min 20 characters</span>
      </div>

      <div className="mt-3">
        <Button
          onClick={handleSubmit}
          disabled={submitting || pitch.trim().length < 20}
        >
          {submitting ? "Submitting..." : "Express Interest"}
        </Button>
      </div>
    </div>
  );
}
