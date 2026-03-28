"use client";

import { Button } from "@/components/ui/button";
import { Calendar, Check, X } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

interface InterviewResponseCardProps {
  applicationId: string;
  companyName: string;
  onResponded?: (accepted: boolean) => void;
}

/**
 * Card shown to candidate when status is 'interview_requested'.
 * Accept reveals first name (Stage 2). Decline ends the application.
 */
export function InterviewResponseCard({
  applicationId,
  companyName,
  onResponded,
}: InterviewResponseCardProps) {
  const [responding, setResponding] = useState(false);
  const [responded, setResponded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResponse = async (accept: boolean) => {
    setResponding(true);
    setError(null);

    const endpoint = accept
      ? `/api/applications/${applicationId}/accept-interview`
      : `/api/applications/${applicationId}/decline-interview`;

    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();

      if (data.ok) {
        setResponded(true);
        onResponded?.(accept);
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setResponding(false);
    }
  };

  if (responded) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border border-amber-200 bg-amber-50 p-5"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Calendar className="h-4 w-4 text-amber-700" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">
            Interview Request from {companyName}
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Accepting will share your first name with the employer. Your last name, email, and phone remain private.
          </p>
          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => handleResponse(true)}
              disabled={responding}
            >
              <Check className="mr-1 h-3 w-3" />
              Accept Interview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResponse(false)}
              disabled={responding}
            >
              <X className="mr-1 h-3 w-3" />
              Decline
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
