"use client";

import { Check, Copy, Mail } from "lucide-react";
import { useState } from "react";

interface MaskedEmailDisplayProps {
  applicantMaskedEmail: string;
}

export function MaskedEmailDisplay({
  applicantMaskedEmail,
}: MaskedEmailDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(applicantMaskedEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
      <Mail className="h-3.5 w-3.5 shrink-0 text-blue-600" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-blue-900">
          {applicantMaskedEmail}
        </p>
        <p className="text-[10px] text-blue-600">
          Emails relay through CheckHire. Real address never exposed.
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-blue-200 bg-white text-blue-600 transition-colors duration-200 hover:bg-blue-100"
        title="Copy masked email"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}
