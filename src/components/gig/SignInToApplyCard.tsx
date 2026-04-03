"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Lock, Shield, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Props = {
  dealSlug: string;
  escrowFunded: boolean;
  amountCents: number;
  dealTitle: string;
};

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function SignInToApplyCard({
  dealSlug,
  escrowFunded,
  amountCents,
  dealTitle,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?intent=signin&redirect=/deal/${dealSlug}`,
        },
      });
      if (authError) setError(authError.message);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const loginUrl = `/login?next=/deal/${dealSlug}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border border-gray-200 bg-white p-6"
    >
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-muted">
          <Shield className="h-6 w-6 text-brand" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Interested in this gig?
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Sign in to submit your application with a pitch, portfolio, and work samples.
          </p>
          <p className="mt-1 truncate text-xs text-slate-600">
            {dealTitle}
          </p>
        </div>

        {escrowFunded && (
          <Badge variant="success">
            <Lock className="mr-1 h-3 w-3" />
            ${(amountCents / 100).toFixed(2)} secured in escrow
          </Badge>
        )}

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 cursor-pointer transition-colors duration-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            {loading ? "Redirecting..." : "Continue with Google"}
          </button>

          <Link href={loginUrl}>
            <Button variant="default" className="w-full">
              Sign in with email
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <p className="text-xs text-slate-600">
          Free to join. No credit card required.
        </p>
      </div>
    </motion.div>
  );
}
