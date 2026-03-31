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
  refundAmountCents: number;
  hasFreelancer: boolean;
  onSuccess: () => void;
  children: React.ReactNode;
};

export function CancelRefundDialog({
  dealId,
  dealTitle,
  refundAmountCents,
  hasFreelancer,
  onSuccess,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const formattedAmount = `$${(refundAmountCents / 100).toFixed(2)}`;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setOpen(false);
      onSuccess();
    } catch {
      // Error handled by parent via refresh
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader title="Cancel this gig?" />
        <div className="space-y-3 px-1">
          <p className="text-sm text-slate-600">
            Your {formattedAmount} will be refunded to your original payment
            method. Refunds typically take 5-10 business days.
          </p>
          {hasFreelancer && (
            <p className="text-sm text-slate-600">
              The freelancer will be notified.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="outline">Keep Gig</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "Cancelling..." : "Cancel & Refund"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
