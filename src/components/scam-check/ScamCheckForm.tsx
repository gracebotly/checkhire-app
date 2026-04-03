"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  ArrowRight,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

type FormState = "idle" | "step2" | "loading" | "success" | "error";

const PLATFORM_OPTIONS = [
  { value: "reddit", label: "Reddit" },
  { value: "facebook", label: "Facebook" },
  { value: "indeed", label: "Indeed" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "discord", label: "Discord" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "craigslist", label: "Craigslist" },
  { value: "twitter", label: "Twitter / X" },
  { value: "other", label: "Other" },
] as const;

const SCAM_TYPE_OPTIONS = [
  { value: "company_impersonation", label: "Impersonating a real company" },
  { value: "upfront_payment", label: "Asking for upfront payment" },
  { value: "too_good_to_be_true", label: "Too good to be true" },
  { value: "personal_info_harvesting", label: "Asking for personal info too early" },
  { value: "crypto_gift_card", label: "Wants payment in crypto or gift cards" },
  { value: "not_sure", label: "Not sure — something feels off" },
  { value: "other", label: "Other" },
] as const;

export function ScamCheckForm({ className = "" }: { className?: string }) {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [email, setEmail] = useState("");
  const [scamType, setScamType] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setState("step2");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!url.trim() || !email.trim() || !platform) {
      setErrorMsg("Please fill in all required fields.");
      setState("error");
      return;
    }

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/scam-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          email: email.trim(),
          platform,
          scam_type: scamType || "not_sure",
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMsg(data.message || "Something went wrong. Please try again.");
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  function resetForm() {
    setState("idle");
    setUrl("");
    setPlatform("");
    setEmail("");
    setScamType("");
    setDescription("");
    setErrorMsg("");
  }

  // ── Success State ──
  if (state === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`text-center ${className}`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-900">
          Submission received — we&apos;re on it.
        </p>
        <p className="mt-1 text-xs text-slate-600">
          We&apos;ll send our findings to {email} within 48 hours.
        </p>
        <button
          onClick={resetForm}
          className="mt-4 cursor-pointer text-xs font-semibold text-brand transition-colors duration-200 hover:text-brand-hover"
        >
          Submit another
        </button>
      </motion.div>
    );
  }

  // ── Step 1: URL Input ──
  if (state === "idle") {
    return (
      <div className={className}>
        <form onSubmit={handleStep1} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste the suspicious job posting link"
                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <button
              type="submit"
              disabled={!url.trim()}
              className="flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Check
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-brand" />
          <p className="text-xs text-slate-600">
            Free investigation — we review posts across Reddit, Facebook, Discord, and more.
          </p>
        </div>
      </div>
    );
  }

  // ── Step 2: Full Form ──
  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* URL — already entered, shown as readonly with edit option */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste the suspicious job posting link"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {/* Platform Selector — required */}
          <div className="relative">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-10 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="" disabled>
                Where did you find this posting? *
              </option>
              {PLATFORM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          </div>

          {/* Email — required */}
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === "error") setState("step2");
            }}
            placeholder="Your email — we'll send the results *"
            required
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />

          {/* Scam Type Selector — optional but encouraged */}
          <div className="relative">
            <select
              value={scamType}
              onChange={(e) => setScamType(e.target.value)}
              className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-10 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">
                What looks suspicious? (optional)
              </option>
              {SCAM_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          </div>

          {/* Description — optional free text */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us more about why this seems suspicious (optional)"
            rows={2}
            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />

          {/* Error message */}
          {state === "error" && (
            <p className="text-xs text-red-600">{errorMsg}</p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={state === "loading" || !url.trim() || !email.trim() || !platform}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Submit for Investigation
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Back link */}
        <button
          onClick={resetForm}
          className="mt-3 cursor-pointer text-xs text-slate-600 transition-colors duration-200 hover:text-brand"
        >
          ← Start over
        </button>
      </motion.div>
    </div>
  );
}
