"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { CancellationRequest } from "@/types/database";

type Props = {
  request: CancellationRequest;
  dealId: string;
  totalAmountCents: number;
  viewerIsRequester: boolean;
  requesterDisplayName: string;
  responderDisplayName: string;
  onResponded: () => void;
};

const DISPUTE_CATEGORIES = [
  { value: "not_delivered", label: "Work was not delivered" },
  { value: "wrong_deliverables", label: "Wrong deliverables" },
  { value: "incomplete_work", label: "Incomplete work" },
  { value: "quality_mismatch", label: "Quality mismatch" },
  { value: "communication_issues", label: "Communication issues" },
  { value: "other", label: "Other" },
] as const;

export function CancellationRequestCard({
  request,
  dealId,
  totalAmountCents,
  viewerIsRequester,
  requesterDisplayName,
  responderDisplayName,
  onResponded,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<"accept" | "reject" | "escalate" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [disputeCategory, setDisputeCategory] = useState<string>("other");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeProposedPercentage, setDisputeProposedPercentage] = useState(50);
  const [disputeJustification, setDisputeJustification] = useState("");

  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    function update() {
      const ms = new Date(request.expires_at).getTime() - Date.now();
      if (ms <= 0) {
        setTimeLeft("Expired");
        setIsExpired(true);
        return;
      }
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(hours >= 1 ? `${hours}h ${minutes}m left` : `${minutes}m left`);
      setIsExpired(false);
    }

    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [request.expires_at]);

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const submit = async (
    action: "accept" | "reject" | "escalate",
    extra?: Record<string, unknown>
  ) => {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(
        `/api/deals/${dealId}/cancellation-requests/${request.id}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...(extra || {}) }),
        }
      );
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Failed to respond");
        return;
      }

      if (action === "accept") {
        toast("Cancellation accepted — refund processing", "success");
      } else if (action === "reject") {
        toast("Cancellation rejected", "info");
      } else {
        toast("Escalated to formal dispute", "info");
      }

      setRejectOpen(false);
      setEscalateOpen(false);
      onResponded();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const canSubmitEscalate =
    disputeReason.trim().length >= 50 && disputeJustification.trim().length >= 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mb-6 rounded-xl border border-gray-200 bg-white p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {viewerIsRequester
              ? "You requested a mutual cancellation"
              : `${requesterDisplayName} requested a mutual cancellation`}
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            {viewerIsRequester
              ? `Waiting for ${responderDisplayName}'s response`
              : "Review the proposed split below and decide how to respond"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          <Clock className="h-3 w-3" />
          {timeLeft}
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Proposed split
        </p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-600">Refund to client</p>
            <p className="font-mono tabular-nums text-base font-semibold text-slate-900">
              {fmt(request.proposed_client_refund_cents)}
            </p>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="text-right">
            <p className="text-xs text-slate-600">To freelancer</p>
            <p className="font-mono tabular-nums text-base font-semibold text-slate-900">
              {fmt(request.proposed_freelancer_payout_cents)}
            </p>
          </div>
        </div>
      </div>

      {request.reason && (
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-900">Reason</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{request.reason}</p>
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-slate-600">
          {error}
        </div>
      )}

      {!viewerIsRequester && !isExpired && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            onClick={() => submit("accept")}
            disabled={loading !== null}
          >
            {loading === "accept" ? "Accepting..." : "Accept & cancel"}
          </Button>

          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={loading !== null}>
                Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader
                title="Reject cancellation request?"
                description="The deal goes back to its current state. You can leave a short note explaining why."
              />
              <div className="space-y-3 px-1">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Reason (optional)"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-brand focus:ring-2 focus:ring-ring/40"
                />
                <p className="text-xs text-slate-600">{rejectReason.length}/500 characters</p>
                <div className="flex justify-end gap-2 pt-2">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    variant="outline"
                    onClick={() =>
                      submit("reject", {
                        response_reason: rejectReason.trim() || undefined,
                      })
                    }
                    disabled={loading !== null}
                  >
                    {loading === "reject" ? "Rejecting..." : "Reject request"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={loading !== null}>
                Escalate to dispute
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader
                title="Escalate to formal dispute?"
                description="This freezes escrow and routes the deal to the formal dispute system. Both parties can submit evidence and propose resolutions."
              />
              <div className="space-y-3 px-1">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-900">Category</label>
                  <Select value={disputeCategory} onValueChange={setDisputeCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISPUTE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-900">
                    What happened? (min 50 characters)
                  </label>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    placeholder="Describe the disagreement..."
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-brand focus:ring-2 focus:ring-ring/40"
                  />
                  <p className="mt-1 text-xs text-slate-600">
                    {disputeReason.trim().length}/2000 — minimum 50 characters
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-900">
                    Your proposed split — % to freelancer
                  </label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono tabular-nums text-base font-semibold text-slate-900">
                        {disputeProposedPercentage}%
                      </span>
                      <span className="font-mono tabular-nums text-xs text-slate-600">
                        {fmt(
                          Math.round((totalAmountCents * disputeProposedPercentage) / 100)
                        )}{" "}
                        to freelancer
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={disputeProposedPercentage}
                      onChange={(e) =>
                        setDisputeProposedPercentage(Number(e.target.value))
                      }
                      className="w-full cursor-pointer accent-[hsl(172,66%,32%)]"
                      aria-label="Proposed percentage to freelancer"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-900">
                    Why is this split fair? (min 50 characters)
                  </label>
                  <textarea
                    value={disputeJustification}
                    onChange={(e) => setDisputeJustification(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    placeholder="Explain your reasoning..."
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-brand focus:ring-2 focus:ring-ring/40"
                  />
                  <p className="mt-1 text-xs text-slate-600">
                    {disputeJustification.trim().length}/2000 — minimum 50 characters
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    variant="default"
                    onClick={() =>
                      submit("escalate", {
                        dispute_category: disputeCategory,
                        dispute_reason: disputeReason.trim(),
                        dispute_proposed_percentage: disputeProposedPercentage,
                        dispute_justification: disputeJustification.trim(),
                      })
                    }
                    disabled={loading !== null || !canSubmitEscalate}
                  >
                    {loading === "escalate" ? "Escalating..." : "Open dispute"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {viewerIsRequester && !isExpired && (
        <p className="text-xs text-slate-600">
          {responderDisplayName} has until the timer above to accept, reject, or
          escalate. You’ll get an email the moment they respond.
        </p>
      )}

      {isExpired && (
        <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-600" />
          <p className="text-xs text-slate-600">
            Expired — escalating to dispute… Refresh the page to load the updated
            state.
          </p>
        </div>
      )}
    </motion.div>
  );
}
