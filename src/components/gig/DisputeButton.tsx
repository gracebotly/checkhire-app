"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DisputeSubmissionFlow } from "@/components/gig/DisputeSubmissionFlow";

type Props = {
  dealId: string;
  dealStatus: string;
  completedAt: string | null;
  totalAmountCents?: number;
  guestToken?: string | null;
};

export function DisputeButton({
  dealId,
  dealStatus,
  completedAt,
  totalAmountCents = 0,
  guestToken = null,
}: Props) {
  const router = useRouter();

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

  return (
    <DisputeSubmissionFlow
      dealId={dealId}
      totalAmountCents={totalAmountCents}
      guestToken={guestToken}
      onSubmitted={() => router.refresh()}
    >
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600 hover:bg-red-50"
      >
        <AlertTriangle className="mr-1 h-3.5 w-3.5" />
        Open Dispute
      </Button>
    </DisputeSubmissionFlow>
  );
}
