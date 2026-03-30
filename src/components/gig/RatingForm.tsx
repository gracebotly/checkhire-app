"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type Props = {
  dealId: string;
  onRated: () => void; // refresh parent after rating
};

export function RatingForm({ dealId, onRated }: Props) {
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (stars === 0) {
      setError("Please select a star rating");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/deals/${dealId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stars,
          comment: comment.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      onRated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  const displayStars = hoverStars || stars;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">
        Rate your experience
      </h3>

      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}

      {/* Star selector */}
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStars(i)}
            onMouseEnter={() => setHoverStars(i)}
            onMouseLeave={() => setHoverStars(0)}
            className="cursor-pointer p-0.5 transition-colors duration-200"
          >
            <Star
              className={cn(
                "h-6 w-6",
                i <= displayStars
                  ? "text-amber-500 fill-amber-500"
                  : "text-gray-200"
              )}
            />
          </button>
        ))}
        {stars > 0 && (
          <span className="ml-2 text-sm text-slate-600">
            {stars} star{stars !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Comment */}
      <div className="mt-3">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How was your experience? (optional)"
          maxLength={500}
          rows={3}
          className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-brand resize-none"
        />
        <p className="mt-1 text-right text-xs text-slate-600">
          {comment.length}/500
        </p>
      </div>

      {/* Submit */}
      <div className="mt-3">
        <Button
          onClick={handleSubmit}
          disabled={submitting || stars === 0}
        >
          {submitting ? "Submitting..." : "Submit Rating"}
        </Button>
      </div>
    </div>
  );
}
