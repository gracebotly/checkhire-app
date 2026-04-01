"use client";

import { useState } from "react";
import { AlertTriangle, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmailConfirmBannerProps {
  emailConfirmed: boolean;
  userEmail?: string | null;
}

export function EmailConfirmBanner({ emailConfirmed, userEmail }: EmailConfirmBannerProps) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  if (emailConfirmed) return null;

  const handleResend = async () => {
    if (resending || resent) return;
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Failed to resend");
        return;
      }
      setResent(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <span className="font-semibold">Verify your email to get started.</span>
            {userEmail && (
              <span className="ml-1">
                We sent a confirmation link to <strong>{userEmail}</strong>.
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {resent ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
              <Mail className="h-3.5 w-3.5" />
              Sent!
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={resending}
              className="text-xs border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
            >
              {resending ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend email"
              )}
            </Button>
          )}
        </div>
      </div>
      {error && (
        <div className="mx-auto max-w-6xl mt-1">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
