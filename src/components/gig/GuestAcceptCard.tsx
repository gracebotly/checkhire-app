"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerificationCodeInput } from "@/components/gig/VerificationCodeInput";
import { createClient } from "@/lib/supabase/client";

type Props = {
  dealId: string;
  dealSlug: string;
  escrowFunded: boolean;
  amountCents: number | null;
  onAccepted: (guestToken: string) => void;
};

type Step = "choose_path" | "verify_code" | "accepted";

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

export function GuestAcceptCard({
  dealId,
  dealSlug,
  escrowFunded,
  amountCents,
  onAccepted,
}: Props) {
  const [step, setStep] = useState<Step>("choose_path");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [codeValue, setCodeValue] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const handleGoogleAuth = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?intent=signin&redirect=/deal/${dealSlug}?accept=true`,
      },
    });
    if (error) setError(error.message);
  };

  const handleSendCode = async () => {
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/deals/${dealId}/guest-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
      const data = await res.json();
      if (data.code === "RATE_LIMITED") {
        setError(data.message);
        return;
      }
      setStep("verify_code");
      setResendCooldown(30);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeComplete = useCallback(
    async (code: string) => {
      if (attempts >= 5) return;
      setLoading(true);
      setCodeError(false);
      setError("");
      try {
        const res = await fetch(`/api/deals/${dealId}/guest-accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            name: name.trim(),
            code,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setCodeError(true);
          setAttempts((a) => a + 1);
          setCodeValue(["", "", "", "", "", ""]);
          if (data.code === "TOO_MANY_ATTEMPTS") {
            setError("Too many attempts. Request a new code.");
          } else {
            setError(data.message || "Incorrect code");
          }
          return;
        }
        setStep("accepted");
        onAccepted(data.guest_token);
      } catch {
        setError("Something went wrong");
        setCodeError(true);
      } finally {
        setLoading(false);
      }
    },
    [dealId, email, name, attempts, onAccepted]
  );

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    try {
      await fetch(`/api/deals/${dealId}/guest-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
      setResendCooldown(30);
      setAttempts(0);
      setCodeValue(["", "", "", "", "", ""]);
    } catch {
      setError("Failed to resend");
    }
  };

  return (
    <div className="bg-brand-muted border border-brand/20 rounded-xl p-6">
      <AnimatePresence mode="wait">
        {step === "choose_path" && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-4"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Accept This Gig
              </h3>
              <div className="mt-2">
                {escrowFunded && amountCents ? (
                  <Badge variant="success">
                    ${(amountCents / 100).toFixed(2)} secured in escrow
                  </Badge>
                ) : (
                  <Badge variant="warning">Escrow not yet funded</Badge>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#4285f4] px-4 py-2.5 text-sm font-medium text-white cursor-pointer transition-colors duration-200 hover:bg-[#3574d4]"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-300" />
              <span className="text-xs text-slate-600">
                or accept without an account
              </span>
              <div className="h-px flex-1 bg-gray-300" />
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                className="w-full"
                onClick={handleSendCode}
                disabled={!name.trim() || !email.trim() || loading}
              >
                {loading ? "Sending..." : "Continue →"}
              </Button>
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <p className="text-xs text-slate-600 text-center">
              By accepting, you agree to CheckHire&apos;s terms of service.
            </p>
          </motion.div>
        )}

        {step === "verify_code" && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-900">
                Check your email
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                We sent a 6-digit code to{" "}
                <strong className="text-slate-900">{email}</strong>
              </p>
            </div>

            <VerificationCodeInput
              value={codeValue}
              onChange={setCodeValue}
              onComplete={handleCodeComplete}
              disabled={loading || attempts >= 5}
              error={codeError}
            />

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            {loading && (
              <p className="text-sm text-slate-600 text-center">
                Verifying...
              </p>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setStep("choose_path");
                  setError("");
                  setCodeValue(["", "", "", "", "", ""]);
                  setAttempts(0);
                }}
                className="text-sm text-slate-600 cursor-pointer transition-colors duration-200 hover:text-slate-900"
              >
                ← Change email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-sm text-brand cursor-pointer transition-colors duration-200 hover:text-brand-hover disabled:text-slate-600 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Didn't get it? Resend"}
              </button>
            </div>
          </motion.div>
        )}

        {step === "accepted" && (
          <motion.div
            key="accepted"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-center space-y-3 py-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            </motion.div>
            <h3 className="text-lg font-semibold text-green-800">
              You&apos;re in!
            </h3>
            <p className="text-sm text-slate-600">
              Start uploading evidence of your work.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
