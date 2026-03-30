"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Eye,
  EyeOff,
  ChevronLeft,
  ArrowLeft,
  Shield,
} from "lucide-react";

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

const FadeIn = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
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
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
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

function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
  onBlur,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  onBlur?: () => void;
  error?: string | null;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ring/40 ${
            error
              ? "border-red-300 focus:border-red-400"
              : "border-gray-200 focus:border-brand"
          }`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(!show)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 transition-colors duration-200 hover:bg-gray-100"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? (
            <EyeOff className="h-4 w-4 text-slate-600" />
          ) : (
            <Eye className="h-4 w-4 text-slate-600" />
          )}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function FieldError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}

export default function AuthShell() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode = searchParams.get("mode");
  const [tab, setTab] = useState<"signin" | "signup">(
    initialMode === "signup" ? "signup" : "signin"
  );

  // Sign-in state
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siError, setSiError] = useState<string | null>(null);
  const [siLoading, setSiLoading] = useState(false);
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
  const [suError, setSuError] = useState<string | null>(null);
  const [suLoading, setSuLoading] = useState(false);
  const [suSuccess, setSuSuccess] = useState(false);

  // Inline validation
  const [suEmailError, setSuEmailError] = useState<string | null>(null);
  const [suPasswordError, setSuPasswordError] = useState<string | null>(null);
  const [siEmailError, setSiEmailError] = useState<string | null>(null);

  const urlError = searchParams.get("error");
  const urlErrorMessage =
    urlError === "not_registered"
      ? "No account found for that email. Please sign up first."
      : urlError === "auth_failed"
        ? "Sign-in was interrupted. Please try again."
        : null;

  const strength = getPasswordStrength(suPassword);

  const validateEmail = (email: string): string | null => {
    if (!email) return null;
    if (!EMAIL_RE.test(email.trim()))
      return "Please enter a valid email (e.g. you@example.com)";
    return null;
  };

  const validateSignupPassword = (pw: string): string | null => {
    if (!pw) return null;
    if (pw.length < 8) return "Must be at least 8 characters";
    return null;
  };

  // ── Sign-in handler ──
  const handleSignIn = async (e: React.FormEvent) => {
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
    const redirect = searchParams.get("redirect") || searchParams.get("next") || "/dashboard";
    router.push(redirect);
    router.refresh();
  };

  // ── Google OAuth ──
  const signInWithGoogle = async (intent: "signin" | "signup" = "signin") => {
    setGoogleLoading(true);
    setSiError(null);
    setSuError(null);
    const params = new URLSearchParams({ intent });
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
  const handleForgotPassword = async (e: React.FormEvent) => {
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
  const handleSignUp = async (e: React.FormEvent) => {
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
        body: JSON.stringify({
          name: suName,
          email: suEmail,
          password: suPassword,
        }),
      });
      const body = await res.json();

      if (!res.ok || !body.ok) {
        setSuError(body?.message || "Sign up failed.");
        setSuLoading(false);
        return;
      }

      if (body?.hasSession) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setSuSuccess(true);
      setSuLoading(false);
    } catch {
      setSuError("Network error during signup.");
      setSuLoading(false);
    }
  };

  // ── Check-email success screen ──
  if (suSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-muted">
            <Mail className="h-6 w-6 text-brand" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Confirm your email
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            We sent a confirmation link to
          </p>
          <p className="text-sm font-medium text-slate-900">{suEmail}</p>
          <div className="mx-auto my-5 h-px w-16 bg-gray-200" />
          <div className="space-y-2 text-xs leading-relaxed text-slate-600">
            <p>Open the email and click the link to activate your account.</p>
            <p>
              Don&apos;t see it? Check your{" "}
              <span className="font-medium text-slate-900">spam or promotions</span>{" "}
              folder.
            </p>
          </div>
          <div className="mt-6">
            <button
              onClick={() => {
                setSuSuccess(false);
                setTab("signin");
              }}
              className="cursor-pointer text-xs font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
            >
              Go to sign in
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="flex w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 shadow-sm">

        {/* ── Brand panel ── */}
        <div className="relative hidden w-[42%] flex-col justify-start gap-8 overflow-hidden bg-[#0F1117] p-9 md:flex">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-teal-600/10" />

          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <Shield className="h-7 w-7 text-teal-400" />
              <span className="font-display text-lg font-bold text-white">CheckHire</span>
            </div>
          </div>

          <div className="relative z-10">
            <h2 className="font-display text-xl font-medium leading-snug tracking-tight text-white">
              Safe escrow.
              <br />
              Fair payments.
              <br />
              Zero freelancer fees.
            </h2>
          </div>

          <div className="relative z-10 space-y-2">
            {[
              "Funds locked before work starts",
              "72-hour auto-release protects freelancers",
              "Freelancer keeps 100% — client pays all fees",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                <span className="text-xs text-slate-400">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Form panel ── */}
        <div className="flex flex-1 flex-col justify-center bg-white px-8 py-10">

          <Link
            href="/"
            className="mb-4 inline-flex cursor-pointer items-center gap-1 self-start text-xs text-slate-600 transition-colors duration-200 hover:text-slate-900"
          >
            <ChevronLeft className="h-3 w-3" />
            Back to site
          </Link>

          {/* Tabs */}
          <div className="mb-6 flex border-b border-gray-100">
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setForgotMode(false);
                  setFpSent(false);
                }}
                className={`cursor-pointer -mb-px mr-5 pb-3 text-sm font-medium transition-colors duration-200 ${
                  tab === t
                    ? "border-b-2 border-brand text-brand"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* ── Sign in ── */}
          <AnimatePresence mode="wait">
            {tab === "signin" && !forgotMode && (
              <FadeIn key="signin-pane" className="space-y-4">
                <div>
                  <h1 className="font-display text-lg font-semibold tracking-tight text-slate-900">
                    Welcome back
                  </h1>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Sign in to manage your deals.
                  </p>
                </div>

                {siError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                    {siError}
                  </div>
                )}

                {urlErrorMessage && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                    {urlErrorMessage}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => signInWithGoogle("signin")}
                    disabled={googleLoading}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <GoogleIcon />
                    {googleLoading ? "Redirecting..." : "Google"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setFpEmail(siEmail);
                      setFpError(null);
                      setFpSent(false);
                    }}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50"
                  >
                    <Mail className="h-4 w-4 text-slate-600" />
                    Email link
                  </button>
                </div>

                <OAuthDivider />

                <form onSubmit={handleSignIn} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-900">Email</label>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={siEmail}
                      onChange={(e) => {
                        setSiEmail(e.target.value);
                        if (siEmailError) setSiEmailError(null);
                      }}
                      onBlur={() => setSiEmailError(validateEmail(siEmail))}
                      placeholder="you@example.com"
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ring/40 ${
                        siEmailError
                          ? "border-red-300 focus:border-red-400"
                          : "border-gray-200 focus:border-brand"
                      }`}
                    />
                    <FieldError msg={siEmailError} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-900">Password</label>
                    <PasswordField
                      value={siPassword}
                      onChange={setSiPassword}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(true);
                        setFpEmail(siEmail);
                        setFpError(null);
                        setFpSent(false);
                      }}
                      className="cursor-pointer mt-1 text-xs font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={siLoading}
                    className="w-full cursor-pointer rounded-lg bg-brand py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {siLoading ? "Signing in..." : "Sign in"}
                  </button>
                </form>

                <p className="text-center text-xs text-slate-600">
                  No account?{" "}
                  <button
                    type="button"
                    onClick={() => setTab("signup")}
                    className="cursor-pointer font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
                  >
                    Create one
                  </button>
                </p>
              </FadeIn>
            )}

            {tab === "signin" && forgotMode && (
              <FadeIn key="forgot-pane" className="space-y-4">
                <div>
                  <h1 className="font-display text-lg font-semibold tracking-tight text-slate-900">
                    Sign in with email link
                  </h1>
                  <p className="mt-0.5 text-xs text-slate-600">
                    We&apos;ll send a one-time link to your inbox. No password needed.
                  </p>
                </div>

                {fpError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                    {fpError}
                  </div>
                )}

                {fpSent ? (
                  <FadeIn className="space-y-5">
                    <div className="rounded-xl border border-gray-200 bg-white px-5 py-6 text-center shadow-sm">
                      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-muted">
                        <Mail className="h-5 w-5 text-brand" />
                      </div>
                      <p className="text-sm font-medium text-green-800">Check your email</p>
                      <p className="mt-1 text-xs text-green-700">
                        We sent a sign-in link to{" "}
                        <span className="font-medium">{fpEmail}</span>.
                        <br />
                        Click the link and you&apos;ll be signed in instantly.
                      </p>
                      <p className="mt-2 text-xs text-green-600/70">
                        Don&apos;t see it? Check your spam folder.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(false);
                        setFpSent(false);
                      }}
                      className="flex w-full cursor-pointer items-center justify-center gap-1 text-xs font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Back to sign in
                    </button>
                  </FadeIn>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-900">Email</label>
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        value={fpEmail}
                        onChange={(e) => setFpEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-ring/40"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={fpLoading}
                      className="w-full cursor-pointer rounded-lg bg-brand py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {fpLoading ? "Sending..." : "Send sign-in link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotMode(false)}
                      className="flex w-full cursor-pointer items-center justify-center gap-1 text-xs font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Back to sign in
                    </button>
                  </form>
                )}
              </FadeIn>
            )}
          </AnimatePresence>

          {/* ── Sign up ── */}
          {tab === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <h1 className="font-display text-lg font-semibold tracking-tight text-slate-900">
                  Create your account
                </h1>
                <p className="mt-0.5 text-xs text-slate-600">
                  Start using safe escrow for gig work.
                </p>
              </div>

              {suError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  {suError}
                </div>
              )}

              {/* Google OAuth — signup */}
              <button
                type="button"
                onClick={() => signInWithGoogle("signup")}
                disabled={googleLoading}
                className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GoogleIcon />
                {googleLoading ? "Redirecting..." : "Sign up with Google"}
              </button>

              <OAuthDivider />

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-900">Full name</label>
                <input
                  type="text"
                  autoComplete="name"
                  required
                  value={suName}
                  onChange={(e) => setSuName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-ring/40"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-900">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={suEmail}
                  onChange={(e) => {
                    setSuEmail(e.target.value);
                    if (suEmailError) setSuEmailError(null);
                  }}
                  onBlur={() => setSuEmailError(validateEmail(suEmail))}
                  placeholder="you@example.com"
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ring/40 ${
                    suEmailError
                      ? "border-red-300 focus:border-red-400"
                      : "border-gray-200 focus:border-brand"
                  }`}
                />
                <FieldError msg={suEmailError} />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-900">Password</label>
                <PasswordField
                  value={suPassword}
                  onChange={(v) => {
                    setSuPassword(v);
                    if (suPasswordError) setSuPasswordError(null);
                  }}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  onBlur={() => setSuPasswordError(validateSignupPassword(suPassword))}
                  error={suPasswordError}
                />
                {suPassword.length > 0 && (
                  <div className="pt-1.5">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                        style={{ width: strength.width }}
                      />
                    </div>
                    <p
                      className={`mt-1 text-xs ${
                        strength.score === 0
                          ? "text-red-500"
                          : strength.score === 1
                            ? "text-amber-500"
                            : "text-green-600"
                      }`}
                    >
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={suLoading}
                className="w-full cursor-pointer rounded-lg bg-brand py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {suLoading ? "Creating account..." : "Create account"}
              </button>

              <p className="text-center text-xs text-slate-600">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setTab("signin")}
                  className="cursor-pointer font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
