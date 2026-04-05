"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield } from "lucide-react";

export default function PostLoginPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      // Check for pending redirect (from SignInToApplyCard or other flows)
      const pendingRedirect = sessionStorage.getItem("checkhire_post_auth_redirect");
      if (pendingRedirect) {
        sessionStorage.removeItem("checkhire_post_auth_redirect");
        router.replace(pendingRedirect);
        return;
      }

      // Check for wizard data (client creating a gig)
      const stored = sessionStorage.getItem("checkhire_wizard_data");
      if (stored) {
        const params = new URLSearchParams(stored);
        const isFromWizard = params.get("from_wizard") === "1";
        if (isFromWizard) {
          sessionStorage.removeItem("checkhire_wizard_data");
          router.replace(`/deal/new?${params.toString()}`);
          return;
        }
      }
    } catch {
      // sessionStorage unavailable — fall through to dashboard
    }

    // Default — go to dashboard
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mx-auto mb-4 flex items-center justify-center gap-2">
          <Shield className="h-6 w-6 text-brand" />
          <span className="font-display text-lg font-bold text-slate-900">
            CheckHire
          </span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
          <p className="text-sm text-slate-600">Setting up your account...</p>
        </div>
      </div>
    </div>
  );
}
