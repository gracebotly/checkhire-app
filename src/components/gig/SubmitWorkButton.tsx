"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onSubmit: () => void;
  loading: boolean;
  hasEvidence: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
};

export function SubmitWorkButton({
  onSubmit,
  loading,
  hasEvidence,
  fullWidth = false,
  size = "md",
}: Props) {
  return (
    <div className={fullWidth ? "w-full" : ""}>
      <Button
        onClick={onSubmit}
        disabled={loading || !hasEvidence}
        size={size}
        className={fullWidth ? "w-full" : ""}
      >
        <Send className="mr-1.5 h-4 w-4" />
        {loading ? "Submitting..." : "Submit Work for Review"}
      </Button>
      {!hasEvidence && !loading && (
        <p className="mt-2 text-xs text-slate-600">
          Upload at least one piece of evidence before submitting.
        </p>
      )}
    </div>
  );
}
