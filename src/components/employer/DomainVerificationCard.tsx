"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  CheckCircle2,
  Loader2,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

interface DomainVerificationCardProps {
  websiteDomain: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  /** If true, shows a compact inline version (for banner use) */
  compact?: boolean;
}

export function DomainVerificationCard({
  websiteDomain,
  isVerified: initialVerified,
  verifiedAt,
  compact = false,
}: DomainVerificationCardProps) {
  const [isVerified, setIsVerified] = useState(initialVerified);
  const [step, setStep] = useState<"email" | "code" | "success">(
    initialVerified ? "success" : "email"
  );
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) setExpiresAt(null);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Send code
  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/employer/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (data.ok) {
        setStep("code");
        const exp = new Date();
        exp.setMinutes(exp.getMinutes() + (data.expires_in_minutes || 15));
        setExpiresAt(exp);
        // Auto-focus code input
        setTimeout(() => codeInputRef.current?.focus(), 100);
      } else {
        setError(data.message || "Failed to send code.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setSending(false);
  };

  // Confirm code
  const handleConfirm = async () => {
    if (code.trim().length !== 6) return;
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch("/api/employer/verify-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();

      if (data.ok) {
        setStep("success");
        setIsVerified(true);
      } else {
        setError(data.message || "Invalid code.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setConfirming(false);
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && code.trim().length === 6) {
      e.preventDefault();
      handleConfirm();
    }
  };

  // ── Already verified ──
  if (isVerified && step === "success") {
    if (compact) {
      return (
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          <span>Domain email verified{verifiedAt ? ` — ${new Date(verifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}</span>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-900">Domain email verified</p>
            <p className="text-xs text-emerald-700">
              {verifiedAt
                ? `Verified on ${new Date(verifiedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                : "Your company email has been verified"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Not yet verified ──
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted">
          <Mail className="h-5 w-5 text-brand" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Verify your company email</p>
          <p className="text-xs text-slate-600">
            {websiteDomain
              ? `Enter your @${websiteDomain} email to verify`
              : "Set your website domain in Company Profile first"}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === "email" && (
          <motion.div
            key="email"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-3"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Company email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={websiteDomain ? `you@${websiteDomain}` : "you@company.com"}
                disabled={!websiteDomain}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !email.trim() || !websiteDomain}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {sending ? "Sending..." : "Send Verification Code"}
            </button>
          </motion.div>
        )}

        {step === "code" && (
          <motion.div
            key="code"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-3"
          >
            <p className="text-sm text-slate-600">
              Enter the 6-digit code sent to <span className="font-medium text-slate-900">{email}</span>
            </p>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Verification code
              </label>
              <input
                ref={codeInputRef}
                type="text"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(val);
                  if (error) setError(null);
                }}
                onKeyDown={handleCodeKeyDown}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-center font-mono text-lg tracking-[0.3em] text-slate-900 shadow-sm placeholder:text-slate-600 placeholder:tracking-[0.3em] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {countdown > 0 && (
              <p className="text-xs text-slate-600">
                Code expires in <span className="font-mono font-medium tabular-nums text-slate-900">{formatCountdown(countdown)}</span>
              </p>
            )}

            {countdown === 0 && expiresAt === null && step === "code" && (
              <p className="text-xs text-amber-600">Code may have expired. Request a new one if needed.</p>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleConfirm}
                disabled={confirming || code.length !== 6}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {confirming ? "Verifying..." : "Verify Code"}
              </button>

              <button
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                  setExpiresAt(null);
                }}
                className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
              >
                Use a different email
              </button>
            </div>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Email verified!</p>
              <p className="text-xs text-emerald-700">Your company domain has been confirmed. You can now post listings.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
