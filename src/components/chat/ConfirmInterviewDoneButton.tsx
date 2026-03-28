"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useState } from "react";

interface ConfirmInterviewDoneButtonProps {
  applicationId: string;
  applicationStatus: string;
  onConfirmed?: () => void;
}

/**
 * Button for either party to confirm the interview has been conducted.
 * Only visible when status is 'interview_accepted'.
 * Advances disclosure to Stage 3.
 */
export function ConfirmInterviewDoneButton({
  applicationId,
  applicationStatus,
  onConfirmed,
}: ConfirmInterviewDoneButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (applicationStatus !== "interview_accepted" || confirmed) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/confirm-interview-done`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.ok) {
        setConfirmed(true);
        onConfirmed?.();
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleConfirm} disabled={loading}>
      <CheckCircle className="mr-1 h-3 w-3" />
      {loading ? "Confirming..." : "Confirm Interview Done"}
    </Button>
  );
}
