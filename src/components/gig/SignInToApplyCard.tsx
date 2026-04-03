"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Lock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Props = {
  dealSlug: string;
  dealId: string;
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
  dealId,
  escrowFunded,
  amountCents,
}: Props) {
  const [pitch, setPitch] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (pitch.trim().length < 20) {
      setError("Your message must be at least 20 characters");
      return;
    }
    // Save pitch to sessionStorage so it survives the auth redirect
    try {
      sessionStorage.setItem(
        `checkhire_pending_pitch_${dealId}`,
        pitch.trim()
      );
    } catch {
      // sessionStorage unavailable — pitch will be lost but auth still works
    }
    setShowAuth(true);
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?intent=signup&redirect=/deal/${dealSlug}?submit_pitch=true`,
        },
      });
      if (authError) setError(authError.message);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const loginUrl = `/login?mode=signup&next=/deal/${dealSlug}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      {!showAuth ? (
        <>
          <h3 className="text-sm font-semibold text-slate-900">
            Want this gig?
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            Tell the client why you&apos;re a good fit.
          </p>

          {escrowFunded && (
            <div className="mt-2">
              <Badge variant="success">
                <Lock className="mr-1 h-3 w-3" />
                ${(amountCents / 100).toFixed(2)} secured
              </Badge>
            </div>
          )}

          <textarea
            value={pitch}
            onChange={(e) => {
              setPitch(e.target.value);
              setError("");
            }}
            placeholder="Introduce yourself — what's your experience with this kind of work?"
            maxLength={1000}
            rows={4}
            className="mt-3 flex w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <div className="mt-1 flex items-center justify-between">
            <span
              className={`text-xs ${
                pitch.length > 1000 ? "text-red-600" : "text-slate-600"
              }`}
            >
              {pitch.length}/1000
            </span>
            <span className="text-xs text-slate-600">Min 20 characters</span>
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}

          <Button
            className="mt-3 w-full"
            onClick={handleSubmit}
            disabled={pitch.trim().length < 20}
          >
            Apply
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Create an account to submit
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Your application is saved. Sign up to send it.
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-slate-600 line-clamp-3">
              {pitch}
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 cursor-pointer transition-colors duration-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GoogleIcon />
              {loading ? "Redirecting..." : "Continue with Google"}
            </button>

            <a href={loginUrl}>
              <Button variant="default" className="w-full">
                Sign up with email
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </a>
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <button
            type="button"
            onClick={() => setShowAuth(false)}
            className="w-full cursor-pointer text-center text-xs text-slate-600 transition-colors duration-200 hover:text-slate-900"
          >
            Back to edit
          </button>
        </div>
      )}
    </motion.div>
  );
}
