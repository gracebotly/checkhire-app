"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  dealId: string;
  dealTitle: string;
  totalAmountCents: number;
  escrowStatus: string;
  role: "client" | "freelancer";
  onSuccess: () => void;
  children: React.ReactNode;
};

export function RequestCancellationDialog({
  dealId,
  dealTitle,
  totalAmountCents,
  escrowStatus,
  role,
  onSuccess,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUnfunded = escrowStatus === "unfunded";
  const [freelancerShareCents, setFreelancerShareCents] = useState(0);
  const [reason, setReason] = useState("");

  const clientRefundCents = totalAmountCents - freelancerShareCents;

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/deals/${dealId}/cancellation-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposed_client_refund_cents: isUnfunded
            ? totalAmountCents
            : clientRefundCents,
          proposed_freelancer_payout_cents: isUnfunded ? 0 : freelancerShareCents,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Failed to send cancellation request");
        return;
      }
      setOpen(false);
      setFreelancerShareCents(0);
      setReason("");
      onSuccess();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader
          title={
            isUnfunded ? "Cancel this draft" : "Request a mutual cancellation"
          }
          description={
            isUnfunded
              ? `Send a request to the other party to cancel ${dealTitle} before any payment is made.`
              : "Both you and the other party need to agree on how the escrow is split. They have 72 hours to respond."
          }
        />

        <div className="space-y-4 px-1">
          {!isUnfunded && (
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-900">
                How should the ${(totalAmountCents / 100).toFixed(2)} be split?
              </label>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600">Refund to client</p>
                    <p className="font-mono tabular-nums text-base font-semibold text-slate-900">
                      {fmt(clientRefundCents)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600">To freelancer</p>
                    <p className="font-mono tabular-nums text-base font-semibold text-slate-900">
                      {fmt(freelancerShareCents)}
                    </p>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={totalAmountCents}
                  step={100}
                  value={freelancerShareCents}
                  onChange={(e) => setFreelancerShareCents(Number(e.target.value))}
                  className="w-full cursor-pointer accent-[hsl(172,66%,32%)]"
                  aria-label="Freelancer share slider"
                />

                <div className="mt-2 flex justify-between text-xs text-slate-600">
                  <span>Full refund</span>
                  <span>Full payout</span>
                </div>
              </div>

              {role === "client" && (
                <p className="mt-2 text-xs text-slate-600">
                  If you propose paying the freelancer for partial work, that amount
                  transfers to them when they accept (or stays in escrow until they
                  connect Stripe).
                </p>
              )}
              {role === "freelancer" && (
                <p className="mt-2 text-xs text-slate-600">
                  Be reasonable about your share — the other party can reject or
                  escalate to a formal dispute if your proposal feels unfair.
                </p>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="cancellation-reason"
              className="mb-1.5 block text-xs font-medium text-slate-900"
            >
              Reason (optional)
            </label>
            <textarea
              id="cancellation-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Why are you requesting cancellation? This helps the other party understand."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-brand focus:ring-2 focus:ring-ring/40"
            />
            <p className="mt-1 text-xs text-slate-600">{reason.length}/500 characters</p>
          </div>

          {error && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-slate-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="outline">Never mind</Button>
            </DialogClose>
            <Button variant="default" onClick={handleSubmit} disabled={loading}>
              {loading ? "Sending..." : "Send request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
