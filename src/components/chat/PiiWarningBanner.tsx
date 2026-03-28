"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface PiiWarningBannerProps {
  warning: string;
  onDismiss?: () => void;
}

export function PiiWarningBanner({ warning, onDismiss }: PiiWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <p className="flex-1 text-xs leading-relaxed text-slate-900">{warning}</p>
      <button
        onClick={() => {
          setDismissed(true);
          onDismiss?.();
        }}
        className="mt-0.5 shrink-0 cursor-pointer rounded-md p-0.5 text-slate-600 transition-colors duration-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label="Dismiss warning"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
