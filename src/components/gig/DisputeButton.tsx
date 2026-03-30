"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

type Props = {
  dealId: string;
  dealStatus: string;
  completedAt: string | null;
};

export function DisputeButton({ dealId, dealStatus, completedAt }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Visibility logic
  const disputeableStatuses = [
    "funded",
    "in_progress",
    "submitted",
    "revision_requested",
  ];
  let visible = disputeableStatuses.includes(dealStatus);

  if (dealStatus === "completed" && completedAt) {
    const completedDate = new Date(completedAt);
    const fourteenDaysLater = new Date(
      completedDate.getTime() + 14 * 24 * 60 * 60 * 1000
    );
    if (new Date() <= fourteenDaysLater) {
      visible = true;
    }
  }

  if (!visible) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message || "Failed to open dispute", "error");
        return;
      }
      toast("Dispute opened — funds are frozen", "success");
      setOpen(false);
      router.refresh();
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-red-600 hover:bg-red-50"
      >
        <AlertTriangle className="mr-1 h-3.5 w-3.5" />
        Open Dispute
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader title="Open a Dispute" />
          <div className="space-y-4 px-6 pb-6">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                Opening a dispute will freeze all funds until a resolution is
                reached. A real human will review your case within 48 hours.
              </p>
            </div>

            <div>
              <label
                htmlFor="dispute-reason"
                className="block text-sm font-medium text-slate-900 mb-1"
              >
                What went wrong?
              </label>
              <textarea
                id="dispute-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 2000))}
                placeholder="Describe the problem — what was agreed, what went wrong, and what outcome you're looking for"
                rows={5}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <p className="mt-1 text-xs text-slate-600 text-right">
                {reason.length}/2000
              </p>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <DialogClose asChild>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                variant="danger"
                size="sm"
                onClick={handleSubmit}
                disabled={!reason.trim() || submitting}
              >
                {submitting ? "Opening..." : "Open Dispute"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
