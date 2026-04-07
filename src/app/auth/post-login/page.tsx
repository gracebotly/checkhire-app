"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PostLoginPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function resolveDestination() {
      // Helper: build /deal/new URL from a flat record of params
      const buildDealNewUrl = (record: Record<string, string>): string => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(record)) {
          if (value) params.set(key, value);
        }
        return `/deal/new?${params.toString()}`;
      };

      // 1. Pending redirect set by other flows (e.g., SignInToApplyCard)
      try {
        const pendingRedirect = sessionStorage.getItem("checkhire_post_auth_redirect");
        if (pendingRedirect) {
          sessionStorage.removeItem("checkhire_post_auth_redirect");
          if (!cancelled) router.replace(pendingRedirect);
          return;
        }
      } catch {
        // sessionStorage unavailable — fall through
      }

      // 2. Database-backed wizard data (PRIMARY source of truth)
      // Works across tabs, devices, and delays — handles the case where
      // the email confirmation link opens in a new tab without access to
      // the original wizard tab's sessionStorage.
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("pending_wizard_data")
            .eq("id", user.id)
            .maybeSingle();

          const pendingData = profile?.pending_wizard_data as Record<string, string> | null;

          if (pendingData && pendingData.from_wizard === "1") {
            // Clear the pending data immediately so it's not reused on
            // a future login. Fire-and-forget — no need to await before
            // navigating.
            void supabase
              .from("user_profiles")
              .update({ pending_wizard_data: null })
              .eq("id", user.id);

            if (!cancelled) router.replace(buildDealNewUrl(pendingData));
            return;
          }
        }
      } catch (err) {
        console.error("[post-login] Failed to read pending_wizard_data:", err);
        // Fall through to sessionStorage check
      }

      // 3. sessionStorage wizard data (FAST PATH for same-tab Google OAuth)
      // Used when the user signs in via Google OAuth and never leaves
      // the browser tab. The database path above also covers this, but
      // sessionStorage is faster and avoids an extra round-trip when
      // it works.
      try {
        const stored = sessionStorage.getItem("checkhire_wizard_data");
        if (stored) {
          const params = new URLSearchParams(stored);
          const isFromWizard = params.get("from_wizard") === "1";
          if (isFromWizard) {
            sessionStorage.removeItem("checkhire_wizard_data");
            if (!cancelled) router.replace(`/deal/new?${params.toString()}`);
            return;
          }
        }
      } catch {
        // sessionStorage unavailable — fall through to default
      }

      // 4. Default — non-wizard signup. Land on /settings so a brand new
      // user can configure their profile (name, bio, avatar, Stripe
      // connect) before they have any deals to look at on /dashboard.
      if (!cancelled) router.replace("/settings");
    }

    void resolveDestination();

    return () => {
      cancelled = true;
    };
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
