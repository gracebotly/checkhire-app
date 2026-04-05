"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Monitor,
  Palette,
  PenTool,
  Video,
  TrendingUp,
  Camera,
  Star,
  Share2,
  Users,
  Music,
  Languages,
  MoreHorizontal,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { DealCategory } from "@/types/database";

const WIZARD_CATEGORIES: {
  value: DealCategory;
  label: string;
  subtitle: string;
  icon: typeof Monitor;
}[] = [
  { value: "web_dev", label: "Web & App Dev", subtitle: "Websites, apps, software", icon: Monitor },
  { value: "design", label: "Design & Branding", subtitle: "Logos, graphics, UI/UX", icon: Palette },
  { value: "writing", label: "Writing & Content", subtitle: "Blogs, copy, scripts", icon: PenTool },
  { value: "video", label: "Video & Animation", subtitle: "Editing, motion, shorts", icon: Video },
  { value: "marketing", label: "Marketing & Ads", subtitle: "Ads, outreach, campaigns", icon: TrendingUp },
  { value: "content_creation", label: "Content Creation", subtitle: "Sponsored, UGC, brand deals", icon: Camera },
  { value: "influencer", label: "Influencer & Creator", subtitle: "Partnerships, collabs, promos", icon: Star },
  { value: "social_media", label: "Social Media Mgmt", subtitle: "Account mgmt, scheduling", icon: Share2 },
  { value: "virtual_assistant", label: "Virtual Assistant", subtitle: "Admin, data, research", icon: Users },
  { value: "audio", label: "Audio & Music", subtitle: "Voice, mixing, transcription", icon: Music },
  { value: "translation", label: "Translation", subtitle: "Any language pair", icon: Languages },
  { value: "other", label: "Other Digital", subtitle: "Anything remote", icon: MoreHorizontal },
];

export function CreateWizard() {
  const router = useRouter();
  const [screen, setScreen] = useState(0);
  const [direction, setDirection] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<DealCategory | null>(null);
  const [otherDescription, setOtherDescription] = useState("");
  // Payment frequency removed from wizard — set in GigCreateForm (budget step)
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const budgetNum = parseFloat(budget) || 0;
  const platformFee = budgetNum * 0.05;
  const subtotal = budgetNum + platformFee;
  const stripeFee = budgetNum > 0 ? subtotal * 0.029 + 0.3 : 0;
  const totalClientPays = subtotal + stripeFee;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const goTo = (n: number) => {
    setDirection(n > screen ? 1 : -1);
    setScreen(n);
  };

  const buildWizardParams = () => {
    const wizardParams = new URLSearchParams();
    if (selectedCategory) wizardParams.set("category", selectedCategory);
    if (title) wizardParams.set("title", title);
    if (budget) wizardParams.set("amount", budget);
    if (selectedCategory === "other" && otherDescription) wizardParams.set("other_desc", otherDescription);
    wizardParams.set("from_wizard", "1");
    return wizardParams;
  };

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    setAuthError("");
    const supabase = createClient();

    // Save wizard data to sessionStorage — survives the OAuth redirect chain
    const wizardParams = buildWizardParams();
    try {
      sessionStorage.setItem("checkhire_wizard_data", wizardParams.toString());
    } catch {
      // sessionStorage unavailable — data will be lost but auth still works
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    setAuthLoading(true);
    setAuthError("");

    if (!name.trim()) {
      setAuthError("Name is required");
      setAuthLoading(false);
      return;
    }
    if (!email.trim()) {
      setAuthError("Email is required");
      setAuthLoading(false);
      return;
    }
    if (password.length < 8) {
      setAuthError("Password must be at least 8 characters");
      setAuthLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Signup failed");

      // After signup, sign in immediately
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw new Error(signInError.message);

      // Save wizard data to sessionStorage as backup
      const wizardParams = buildWizardParams();
      try {
        sessionStorage.setItem("checkhire_wizard_data", wizardParams.toString());
      } catch {
        // sessionStorage unavailable
      }

      // Hard navigation ensures the auth cookie is sent with the request.
      // router.push + router.refresh causes a race condition where the
      // server component at /deal/new may not have the session cookie yet.
      window.location.href = `/deal/new?${wizardParams.toString()}`;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      {/* Progress dots */}
      <div className="mb-6 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              i <= screen ? "bg-brand" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={screen}
          custom={direction}
          initial={{ opacity: 0, x: direction * 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -30 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {/* Screen 0 — How it works */}
          {screen === 0 && (
            <div>
              <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-brand-muted px-4 py-1.5">
                <Shield className="h-4 w-4 text-brand" />
                <span className="text-xs font-semibold text-brand">PROTECTED DEALS</span>
              </div>

              <h1 className="font-display text-2xl font-bold text-slate-900 md:text-3xl">
                Work with anyone online —<br />
                <span className="text-brand">without the risk.</span>
              </h1>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Define what will be delivered. Secure the payment. Release when you&apos;re happy. Simple as sharing a link.
              </p>

              <div className="mt-6 flex gap-3">
                {[
                  { num: "1", title: "Define the deal", sub: "Set clear expectations upfront" },
                  { num: "2", title: "Secure the payment", sub: "Funds held until work is done" },
                  { num: "3", title: "Release with confidence", sub: "Or auto-releases in 72 hours" },
                ].map((s, i) => (
                  <motion.div
                    key={s.num}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut", delay: 0.1 + i * 0.08 }}
                    className="flex-1 rounded-xl border border-gray-200 bg-white p-4 text-center"
                  >
                    <div className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-muted text-xs font-semibold text-brand">
                      {s.num}
                    </div>
                    <p className="text-xs font-semibold text-slate-900">{s.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{s.sub}</p>
                  </motion.div>
                ))}
              </div>

              <p className="mt-6 text-xs text-slate-600 leading-relaxed">
                Freelancer keeps <span className="font-semibold text-brand">100%</span>. You pay 5% + processing. Cancel and get a full refund anytime before work starts.
              </p>

              <Button size="lg" className="mt-6 w-full" onClick={() => goTo(1)}>
                Create a deal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Screen 1 — Category selection */}
          {screen === 1 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Step 1 of 3</p>
              <h2 className="mt-1 font-display text-xl font-bold text-slate-900">What kind of work?</h2>
              <p className="mt-1 text-sm text-slate-600">Pick the category that fits your gig.</p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {WIZARD_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const selected = selectedCategory === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`cursor-pointer rounded-xl border p-3 text-center transition-colors duration-200 ${
                        selected
                          ? "border-brand bg-brand-muted"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className={`mx-auto h-5 w-5 ${selected ? "text-brand" : "text-slate-600"}`} />
                      <p className="mt-1.5 text-xs font-semibold text-slate-900">{cat.label}</p>
                    </button>
                  );
                })}
              </div>

              {/* "Other" category description — slides in when Other is selected */}
              {selectedCategory === "other" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="mt-3"
                >
                  <label className="mb-1.5 block text-sm font-medium text-slate-900">
                    Briefly describe the work
                  </label>
                  <Input
                    value={otherDescription}
                    onChange={(e) => setOtherDescription(e.target.value)}
                    placeholder="e.g., Data analysis for a research project"
                    maxLength={100}
                  />
                  <p className="mt-1 text-xs text-slate-600">
                    {otherDescription.length}/100 — helps us ensure this is a supported service
                  </p>
                </motion.div>
              )}

              <Button
                size="lg"
                className="mt-6 w-full"
                disabled={!selectedCategory || (selectedCategory === "other" && otherDescription.length < 10)}
                onClick={() => goTo(2)}
              >
                Continue
              </Button>
              <button
                type="button"
                onClick={() => goTo(0)}
                className="mt-2 w-full cursor-pointer text-center text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900"
              >
                Back
              </button>
            </div>
          )}

          {/* Screen 2 — Title + Budget + Fee Calculator + Preview */}
          {screen === 2 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Step 2 of 3</p>
              <h2 className="mt-1 font-display text-xl font-bold text-slate-900">Define your deal</h2>
              <p className="mt-1 text-sm text-slate-600">This is what the other person sees when they open your deal link. Be specific — clear terms prevent disputes.</p>

              <div className="mt-5">
                <label className="mb-1.5 block text-sm font-medium text-slate-900">Deal title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Design a logo for my podcast"
                  maxLength={80}
                />
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-900">Payment amount</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-600">$</span>
                  <Input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="100"
                    min={10}
                    className="pl-7"
                  />
                </div>
              </div>

              {/* Fee breakdown */}
              {budgetNum >= 10 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="mt-4 rounded-xl bg-gray-50 p-4"
                >
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm font-semibold text-brand">Freelancer receives</span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-brand">{fmt(budgetNum)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-slate-600">Platform fee (5%)</span>
                    <span className="font-mono text-xs tabular-nums text-slate-600">{fmt(platformFee)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-slate-600">Payment processing</span>
                    <span className="font-mono text-xs tabular-nums text-slate-600">{fmt(stripeFee)}</span>
                  </div>
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">You pay</span>
                      <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">{fmt(totalClientPays)}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Live link preview */}
              {title.length >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="mt-4 rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-muted px-3 py-1">
                    <Shield className="h-3 w-3 text-brand" />
                    <span className="text-xs font-semibold text-brand">Deal preview</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {WIZARD_CATEGORIES.find((c) => c.value === selectedCategory)?.label}
                  </p>
                  {budgetNum >= 10 && (
                    <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-brand">{fmt(budgetNum)}</p>
                  )}
                  <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-slate-600">Preview of your deal page</p>
                  </div>
                </motion.div>
              )}

              <Button
                size="lg"
                className="mt-6 w-full"
                disabled={title.length < 3 || budgetNum < 10}
                onClick={() => goTo(3)}
              >
                Almost done
              </Button>
              <button
                type="button"
                onClick={() => goTo(1)}
                className="mt-2 w-full cursor-pointer text-center text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900"
              >
                Back
              </button>
            </div>
          )}

          {/* Screen 3 — Auth gate */}
          {screen === 3 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Last step</p>
              <h2 className="mt-1 font-display text-xl font-bold text-slate-900">Your deal is almost live</h2>
              <p className="mt-1 text-sm text-slate-600">Create an account to publish your deal. Takes 10 seconds.</p>

              <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
                {/* Google OAuth */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={authLoading}
                  className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors duration-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-slate-600">or</span>
                  </div>
                </div>

                {/* Email signup form */}
                <div className="space-y-3">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                  />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                  />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password (min 8 characters)"
                  />
                  {authError && (
                    <p className="text-xs text-red-500">{authError}</p>
                  )}
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleEmailSignup}
                    disabled={authLoading}
                  >
                    {authLoading ? "Creating account..." : "Sign up with email"}
                  </Button>
                </div>

                <p className="mt-4 text-center text-xs text-slate-600">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      const wizardParams = buildWizardParams();
                      try {
                        sessionStorage.setItem("checkhire_wizard_data", wizardParams.toString());
                      } catch {
                        // sessionStorage unavailable
                      }
                      router.push(`/login?next=${encodeURIComponent(`/deal/new?${wizardParams.toString()}`)}`);
                    }}
                    className="cursor-pointer font-semibold text-brand transition-colors duration-200 hover:text-brand-hover"
                  >
                    Sign in
                  </button>
                </p>
              </div>

              <button
                type="button"
                onClick={() => goTo(2)}
                className="mt-3 w-full cursor-pointer text-center text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900"
              >
                Back
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
