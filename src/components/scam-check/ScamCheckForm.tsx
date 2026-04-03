"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Search, ArrowRight, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";

type FormState = "idle" | "loading" | "success" | "error";

export function ScamCheckForm({ className = "" }: { className?: string }) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/scam-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          email: email.trim() || undefined,
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
          {email
            ? `We'll send our findings to ${email} within 48 hours.`
            : "Check back soon — we'll publish our findings."}
        </p>
        <button
          onClick={() => {
            setState("idle");
            setUrl("");
            setEmail("");
            setDescription("");
            setShowDetails(false);
          }}
          className="mt-4 cursor-pointer text-xs font-semibold text-brand transition-colors duration-200 hover:text-brand-hover"
        >
          Submit another
        </button>
      </motion.div>
    );
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* URL input — the primary field */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (state === "error") setState("idle");
              }}
              placeholder="Paste the suspicious job posting link"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <button
            type="submit"
            disabled={!url.trim() || state === "loading"}
            className="flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Check
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Expandable details */}
        {!showDetails ? (
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="cursor-pointer text-xs text-slate-600 transition-colors duration-200 hover:text-brand"
          >
            + Add your email to get the results (optional)
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-2"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email — we'll send the results (optional)"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What seems off about this posting? (optional)"
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </motion.div>
        )}

        {/* Error message */}
        {state === "error" && (
          <p className="text-xs text-red-600">{errorMsg}</p>
        )}
      </form>

      {/* Trust signals */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-brand" />
        <p className="text-xs text-slate-600">
          Free investigation — we review posts across Reddit, Facebook, Discord, and more.
        </p>
      </div>
    </div>
  );
}
