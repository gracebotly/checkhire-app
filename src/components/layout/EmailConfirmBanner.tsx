"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface EmailConfirmBannerProps {
  emailConfirmed: boolean;
}

export function EmailConfirmBanner({ emailConfirmed }: EmailConfirmBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (emailConfirmed || dismissed) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Please verify your email address. Check your inbox for a confirmation
            link.
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 cursor-pointer rounded p-1 text-amber-600 transition-colors duration-200 hover:bg-amber-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
