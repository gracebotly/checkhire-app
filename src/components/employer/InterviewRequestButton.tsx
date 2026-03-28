"use client";

import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { useState } from "react";

interface InterviewRequestButtonProps {
  applicationId: string;
  currentStatus: string;
  onStatusChange: (applicationId: string, newStatus: string) => void;
}

/**
 * "Request Interview" button that changes application status to interview_requested.
 * Only visible when status is 'reviewed' or 'shortlisted'.
 */
export function InterviewRequestButton({
  applicationId,
  currentStatus,
  onStatusChange,
}: InterviewRequestButtonProps) {
  const [loading, setLoading] = useState(false);

  if (!["reviewed", "shortlisted"].includes(currentStatus)) {
    return null;
  }

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employer/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "interview_requested" }),
      });
      const data = await res.json();
      if (data.ok) {
        onStatusChange(applicationId, "interview_requested");
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleClick}
      disabled={loading}
    >
      <Video className="mr-1 h-3 w-3" />
      {loading ? "Requesting..." : "Request Interview"}
    </Button>
  );
}
