"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Eye, EyeOff, ArrowLeft, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const EMAIL_RE =
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;

function getPasswordStrength(pw: string): {
  score: 0 | 1 | 2;
  label: string;
  color: string;
  width: string;
} {
  if (!pw || pw.length < 8)
    return { score: 0, label: "Too short", color: "bg-red-400", width: "33%" };
  let pts = 0;
  if (pw.length >= 8) pts++;
  if (pw.length >= 12) pts++;
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) pts++;
  if (/[^A-Za-z0-9]/.test(pw)) pts++;
  if (pts <= 1) return { score: 0, label: "Weak", color: "bg-red-400", width: "33%" };
  if (pts <= 2) return { score: 1, label: "OK", color: "bg-amber-400", width: "66%" };
  return { score: 2, label: "Strong", color: "bg-green-500", width: "100%" };
}

const FadeIn = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const OAuthDivider = () => (
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-100" />
    </div>
    <div className="relative flex justify-center text-xs">
      <span className="bg-white px-2 text-slate-600">or</span>
    </div>
  </div>
);

type Tab = "signin" | "signup";

export default function AuthShell() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const defaultTab: Tab =
    searchParams.get("mode") === "signup" || searchParams.get("tab") === "signup"
      ? "signup"
      : "signin";
  const [tab, setTab] = useState<Tab>(defaultTab);

  // Sign-in state
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siError, setSiError] = useState<string | null>(null);
  const [siLoading, setSiLoading] = useState(false);
  const [showSiPassword, setShowSiPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState<string | null>(null);
  const [fpSent, setFpSent] = useState(false);

  // Sign-up state
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [showSuPassword, setShowSuPassword] = useState(false);
  const [suError, setSuError] = useState<string | null>(null);
  const [suLoading, setSuLoading] = useState(false);
  const [suSuccess, setSuSuccess] = useState(false);

  // URL error from redirect
  const urlError = searchParams.get("error");
  const urlErrorMessage =
    urlError === "not_registered"
      ? "No account found for that email. Please sign up first."
      : urlError === "auth_failed"
        ? "Sign-in was interrupted. Please try again."
        : null;

  const strength = getPasswordStrength(suPassword);

  // ── Sign-in handler ──
  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setSiLoading(true);
    setSiError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: siEmail,
      password: siPassword,
    });
    if (error) {
      setSiError(error.message);
      setSiLoading(false);
      return;
    }
    const redirectTo = searchParams.get("redirect") || searchParams.get("next");
    router.push(redirectTo || "/dashboard");
    router.refresh();
  };

  // ── Google OAuth ──
  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    setSiError(null);
    setSuError(null);
    const params = new URLSearchParams({ intent: tab });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?${params.toString()}`,
      },
    });
    if (error) {
      setSiError(error.message);
      setSuError(error.message);
      setGoogleLoading(false);
    }
  };

  // ── Forgot password (magic link) ──
  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setFpLoading(true);
    setFpError(null);

    if (!EMAIL_RE.test(fpEmail.trim())) {
      setFpError("Please enter a valid email address.");
      setFpLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/send-signin-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data.code === "typo_detected" && data.suggested) {
          setFpEmail(data.suggested);
          setFpError(data.message);
        } else {
          setFpError(data.message || "Something went wrong. Please try again.");
        }
        setFpLoading(false);
        return;
      }

      setFpSent(true);
      setFpLoading(false);
    } catch {
      setFpError("Network error. Please try again.");
      setFpLoading(false);
    }
  };

  // ── Sign-up handler ──
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setSuLoading(true);
    setSuError(null);

    if (!EMAIL_RE.test(suEmail.trim())) {
      setSuError("Please enter a valid email address.");
      setSuLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: suName, email: suEmail, password: suPassword }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setSuError(data.message || "Signup failed.");
        setSuLoading(false);
        return;
      }

      setSuSuccess(true);
      setSuLoading(false);
    } catch {
      setSuError("Network error. Please try again.");
      setSuLoading(false);
    }
  };

  // ── Forgot password view ──
  if (forgotMode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
        <FadeIn className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <button
            onClick={() => { setForgotMode(false); setFpSent(false); setFpError(null); }}
            className="mb-4 flex cursor-pointer items-center gap-1 text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </button>

          {fpSent ? (
            <div>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                <Mail className="h-6 w-6 text-brand" />
              </div>
              <h1 className="font-display text-xl font-bold text-slate-900">Check your email</h1>
              <p className="mt-2 text-sm text-slate-600">
                If an account exists for <strong className="text-slate-900">{fpEmail}</strong>,
                we sent a magic sign-in link. Click it to log in — no password needed.
              </p>
            </div>
          ) : (
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">Forgot password?</h1>
              <p className="mt-1 text-sm text-slate-600">
                Enter your email and we&apos;ll send a magic sign-in link.
              </p>
              <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
                <input
                  type="email"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-ring/40"
                />
                {fpError && <p className="text-sm text-red-600">{fpError}</p>}
                <button
                  type="submit"
                  disabled={fpLoading}
                  className="w-full cursor-pointer rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fpLoading ? "Sending..." : "Send magic link"}
                </button>
              </form>
            </div>
          )}
        </FadeIn>
      </main>
    );
  }

  // ── Signup success view ──
  if (suSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
        <FadeIn className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
            <Mail className="h-6 w-6 text-brand" />
          </div>
          <h1 className="font-display text-xl font-bold text-slate-900">Check your email</h1>
          <p className="mt-2 text-sm text-slate-600">
            We sent a confirmation link to <strong className="text-slate-900">{suEmail}</strong>.
            Click it to activate your account.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm text-brand hover:underline">
            Back to home
          </Link>
        </FadeIn>
      </main>
    );
  }

  // ── Main auth form ──
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <FadeIn className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-brand" />
          <span className="font-display text-sm font-bold text-brand">CheckHire</span>
        </div>

        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">
          {tab === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {tab === "signin"
            ? "Sign in to manage your deals."
            : "Start using safe escrow for gig work."}
        </p>

        {urlErrorMessage && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {urlErrorMessage}
          </div>
        )}

        {/* Tab switcher */}
        <div className="mt-6 flex rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setTab("signin")}
            className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
              tab === "signin"
                ? "bg-brand text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab("signup")}
            className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
              tab === "signup"
                ? "bg-brand text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Google OAuth */}
        <button
          onClick={signInWithGoogle}
          disabled={googleLoading}
          className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        <OAuthDivider />

        <AnimatePresence mode="wait">
          {tab === "signin" ? (
            <motion.form
              key="signin"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleSignIn}
              className="mt-4 space-y-4"
            >
              <input
                type="email"
                value={siEmail}
                onChange={(e) => setSiEmail(e.target.value)}
                placeholder="Email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-ring/40"
              />
              <div className="relative">
                <input
                  type={showSiPassword ? "text" : "password"}
                  value={siPassword}
                  onChange={(e) => setSiPassword(e.target.value)}
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-ring/40"
                />
                <button
                  type="button"
                  onClick={() => setShowSiPassword(!showSiPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-600"
                >
                  {showSiPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setFpEmail(siEmail); }}
                  className="cursor-pointer text-xs font-medium text-brand transition-colors duration-200 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {siError && <p className="text-sm text-red-600">{siError}</p>}

              <button
                type="submit"
                disabled={siLoading}
                className="w-full cursor-pointer rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {siLoading ? "Signing in..." : "Sign In"}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="signup"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleSignUp}
              className="mt-4 space-y-4"
            >
              <input
                type="text"
                value={suName}
                onChange={(e) => setSuName(e.target.value)}
                placeholder="Name"
                autoComplete="name"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-ring/40"
              />
              <input
                type="email"
                value={suEmail}
                onChange={(e) => setSuEmail(e.target.value)}
                placeholder="Email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-ring/40"
              />
              <div className="relative">
                <input
                  type={showSuPassword ? "text" : "password"}
                  value={suPassword}
                  onChange={(e) => setSuPassword(e.target.value)}
                  placeholder="Password (8+ characters)"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-ring/40"
                />
                <button
                  type="button"
                  onClick={() => setShowSuPassword(!showSuPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-600"
                >
                  {showSuPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password strength bar */}
              {suPassword.length > 0 && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <p className="text-xs text-slate-600">{strength.label}</p>
                </div>
              )}

              {suError && <p className="text-sm text-red-600">{suError}</p>}

              <button
                type="submit"
                disabled={suLoading}
                className="w-full cursor-pointer rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {suLoading ? "Creating account..." : "Create Account"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-6 text-center text-xs text-slate-600">
          <Link href="/" className="cursor-pointer transition-colors duration-200 hover:text-slate-900">
            &larr; Back to home
          </Link>
        </div>
      </FadeIn>
    </main>
  );
}
