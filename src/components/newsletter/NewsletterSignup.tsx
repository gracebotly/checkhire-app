"use client";

import { useState, FormEvent } from "react";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle, Loader2, Mail } from "lucide-react";

interface NewsletterSignupProps {
  variant: "inline" | "compact" | "card";
  heading?: string;
  description?: string;
  placeholder?: string;
  buttonText?: string;
  utmCampaign: string;
  className?: string;
}

type FormState = "idle" | "loading" | "success" | "already_subscribed" | "error";

export function NewsletterSignup({
  variant,
  heading,
  description,
  placeholder = "Enter your email",
  buttonText = "Subscribe",
  utmCampaign,
  className = "",
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    setState("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, utmCampaign }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.alreadySubscribed ? "already_subscribed" : "success");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  const isSuccess = state === "success" || state === "already_subscribed";

  if (variant === "compact") {
    return (
      <div className={className}>
        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-slate-900">
              {state === "already_subscribed"
                ? "You're already on the list!"
                : "You're in! Check your inbox."}
            </span>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state === "error") setState("idle");
              }}
              placeholder={placeholder}
              disabled={state === "loading"}
              className={`flex-1 rounded-lg border bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-brand disabled:opacity-50 disabled:cursor-not-allowed ${
                state === "error" ? "border-red-300" : "border-gray-200"
              }`}
            />
            <button
              type="submit"
              disabled={state === "loading" || !email}
              className="flex items-center justify-center rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-200 hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
            >
              {state === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </form>
        )}
        {!isSuccess && (
          <div className="mt-1.5">
            {state === "error" ? (
              <p className="text-xs text-red-600">
                Something went wrong. Try again.
              </p>
            ) : (
              <p className="text-xs text-slate-600">Free weekly scam alerts</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`rounded-xl border border-gray-200 bg-white p-6 ${className}`}
      >
        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-col items-center py-4 text-center"
          >
            <CheckCircle className="h-8 w-8 text-green-600" />
            <p className="mt-3 text-sm font-medium text-slate-900">
              {state === "already_subscribed"
                ? "You're already on the list!"
                : "You're in! Check your inbox."}
            </p>
          </motion.div>
        ) : (
          <>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted">
              <Mail className="h-5 w-5 text-brand" />
            </div>
            {heading && (
              <h3 className="text-base font-semibold font-display text-slate-900">
                {heading}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            )}
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state === "error") setState("idle");
                }}
                placeholder={placeholder}
                disabled={state === "loading"}
                className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-brand disabled:opacity-50 disabled:cursor-not-allowed ${
                  state === "error" ? "border-red-300" : "border-gray-200"
                }`}
              />
              <button
                type="submit"
                disabled={state === "loading" || !email}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white cursor-pointer transition-colors duration-200 hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
              >
                {state === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {buttonText}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
            {state === "error" ? (
              <p className="mt-2 text-xs text-red-600">
                Something went wrong. Try again.
              </p>
            ) : (
              <p className="mt-3 text-xs text-slate-600">
                Join freelancers who protect their payments
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  // inline variant
  return (
    <div className={className}>
      {isSuccess ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex items-center justify-center gap-2"
        >
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-slate-900">
            {state === "already_subscribed"
              ? "You're already on the list!"
              : "You're in! Check your inbox."}
          </span>
        </motion.div>
      ) : (
        <>
          {heading && (
            <h3 className="text-lg font-semibold font-display text-slate-900">
              {heading}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          )}
          <form
            onSubmit={handleSubmit}
            className={`${heading || description ? "mt-4" : ""} flex flex-col gap-3 sm:flex-row`}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state === "error") setState("idle");
              }}
              placeholder={placeholder}
              disabled={state === "loading"}
              className={`flex-1 rounded-lg border bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-brand disabled:opacity-50 disabled:cursor-not-allowed ${
                state === "error" ? "border-red-300" : "border-gray-200"
              }`}
            />
            <button
              type="submit"
              disabled={state === "loading" || !email}
              className="flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white cursor-pointer transition-colors duration-200 hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
            >
              {state === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {buttonText}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
          {state === "error" ? (
            <p className="mt-2 text-xs text-red-600">
              Something went wrong. Try again.
            </p>
          ) : (
            <p className="mt-3 text-xs text-slate-600">
              Join freelancers who protect their payments
            </p>
          )}
        </>
      )}
    </div>
  );
}
