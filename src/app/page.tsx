"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";
import { FeeCalculator } from "@/components/gig/FeeCalculator";
import { PaymentMethodsBar } from "@/components/gig/PaymentMethodsBar";
import { PayoutSpeedComparison } from "@/components/gig/PayoutSpeedComparison";
import { ReferralWelcomeBanner } from "@/components/referral/ReferralWelcomeBanner";
import {
  RedditIcon,
  WhatsAppIcon,
  TwitterXIcon,
  FacebookIcon,
  DiscordIcon,
} from "@/components/icons/SocialIcons";
import {
  Shield,
  ArrowRight,
  Lock,
  Clock,
  DollarSign,
  FileText,
  Share2,
  Zap,
  Building2,
  Mail,
} from "lucide-react";

const section = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.4, ease: "easeOut" as const, delay },
});

function HomePageContent() {
  const searchParams = useSearchParams();
  const isReferred = searchParams.get("referred") === "1";

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {isReferred && <ReferralWelcomeBanner />}
        {/* 1. Hero — Email Capture First */}
        <motion.section className="px-6 py-20 md:py-28" {...section(0)}>
          <div className="mx-auto max-w-6xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-brand-muted bg-brand-muted px-4 py-1.5">
              <Shield className="h-4 w-4 text-brand" />
              <span className="text-xs font-semibold text-brand">
                DEAL PROTECTION FOR THE INTERNET
              </span>
            </div>

            <h1 className="font-display text-3xl font-bold text-slate-900 md:text-5xl md:leading-tight">
              Never get scammed again{" "}
              <span className="text-brand">paying someone online.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-base text-slate-600 md:text-lg">
              Define the work. Lock the payment. Get protected — before anything starts.
            </p>

            {/* Email capture — the primary CTA */}
            <div className="mx-auto mt-8 max-w-md">
              <NewsletterSignup
                variant="inline"
                utmCampaign="hero"
                placeholder="Enter your email"
                buttonText="Join Free"
                heading=""
                description=""
              />
            </div>

            <p className="mx-auto mt-3 max-w-md text-xs text-slate-600">
              Free weekly newsletter — scam alerts, safe hiring tips, verified gigs. Unsubscribe anytime.
            </p>

            {/* Secondary link — not a big CTA button */}
            <p className="mt-6 text-sm text-slate-600">
              Ready to protect a deal?{" "}
              <Link
                href="/create"
                className="cursor-pointer font-semibold text-brand transition-colors duration-200 hover:text-brand-hover"
              >
                Create a protected deal
                <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
              </Link>
            </p>

            {/* Stat bar */}
            <div className="mx-auto mt-10 flex max-w-md items-center justify-center gap-6 border-t border-gray-100 pt-8">
              <div className="text-center">
                <p className="font-mono text-xl font-bold tabular-nums text-brand">
                  $0
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Freelancer fees
                </p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="text-center">
                <p className="font-mono text-xl font-bold tabular-nums text-brand">
                  72hr
                </p>
                <p className="mt-0.5 text-xs text-slate-600">Auto-release protection</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="text-center">
                <p className="font-mono text-xl font-bold tabular-nums text-brand">
                  100%
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Freelancer keeps it all
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* 2. Social Proof / Community Badge */}
        <motion.section className="px-6 py-10" {...section(0.02)}>
          <div className="mx-auto max-w-6xl">
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <p className="text-sm font-semibold text-slate-900">
                The only hiring community where every job poster is verified
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Every hiring post on r/checkhire is backed by locked money or a real face on video. No anonymous scammers get through.
              </p>
              <a
                href="https://reddit.com/r/checkhire"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-colors duration-200 hover:bg-gray-50"
              >
                <RedditIcon className="h-4 w-4" />
                Join r/checkhire
              </a>
            </div>
          </div>
        </motion.section>

        {/* 3. We Protect the Deal Before It Starts */}
        <motion.section
          id="how-it-works"
          className="px-6 py-16"
          {...section(0.04)}
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-10 text-center font-display text-2xl font-bold text-slate-900">
              We Protect the Deal Before It Starts
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                  <FileText className="h-5 w-5 text-brand" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Define the deal
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Outline what will be delivered, when, and how success is measured. Get a shareable link in seconds.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                  <Share2 className="h-5 w-5 text-brand" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Share it anywhere
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Reddit, Facebook, Discord, WhatsApp, email, text — your protected deal link works everywhere.
                </p>
                <div className="mt-3 flex items-center justify-center gap-2 text-slate-600">
                  <RedditIcon className="h-4 w-4" />
                  <FacebookIcon className="h-4 w-4" />
                  <DiscordIcon className="h-4 w-4" />
                  <WhatsAppIcon className="h-4 w-4" />
                  <TwitterXIcon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                  <Zap className="h-5 w-5 text-brand" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Release with confidence
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Payment is released only when the work is confirmed — or auto-releases in 72 hours if the client goes silent.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* 4. Fee Calculator */}
        <motion.section className="px-6 py-16" {...section(0.06)}>
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-slate-900">
              Transparent pricing. No hidden fees.
            </h2>
            <div className="mx-auto max-w-md">
              <FeeCalculator />
            </div>
          </div>
        </motion.section>

        {/* 5. Instant Payout Callout */}
        <motion.section className="px-6 py-16" {...section(0.08)}>
          <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2">
            <div>
              <span className="mb-4 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                FASTEST PAYOUTS IN THE INDUSTRY
              </span>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Get paid in minutes — not weeks.
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Other platforms hold your money for 7-14 days. On CheckHire, funds release the moment work is approved. No waiting. No wondering.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-muted">
                    <Zap className="h-4 w-4 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Instant payout
                    </p>
                    <p className="text-xs text-slate-600">
                      Under 30 minutes to your debit card — 1% fee
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-muted">
                    <Building2 className="h-4 w-4 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Standard payout
                    </p>
                    <p className="text-xs text-slate-600">
                      2 business days to your bank — free
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <PayoutSpeedComparison />
          </div>
        </motion.section>

        {/* 6. Payment Methods */}
        <motion.section className="px-6 py-10" {...section(0.1)}>
          <div className="mx-auto max-w-6xl">
            <p className="mb-6 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
              We accept
            </p>
            <PaymentMethodsBar variant="full" />
          </div>
        </motion.section>

        {/* 7. Value Props */}
        <motion.section
          className="border-t border-gray-100 bg-gray-50 px-6 py-16"
          {...section(0.12)}
        >
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                <Lock className="h-5 w-5 text-brand" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Payment is secured before anyone starts
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Funds are held safely and only move when both sides agree the work is complete. The freelancer sees the exact amount locked for them.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                <Clock className="h-5 w-5 text-brand" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                72-hour auto-release
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                If the client disappears after work is submitted, funds auto-release to the freelancer. No more ghost clients. No more chasing payments.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                <DollarSign className="h-5 w-5 text-brand" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Freelancers pay nothing. Ever.
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                The client covers all fees. The freelancer receives exactly the posted amount — no deductions, no commissions, no surprises.
              </p>
            </div>
          </div>
        </motion.section>

        {/* 8. Bottom CTA — Newsletter + Payment Link */}
        <motion.section className="px-6 py-16" {...section(0.14)}>
          <div className="mx-auto max-w-6xl">
            <div className="grid items-start gap-8 md:grid-cols-2">
              <NewsletterSignup
                variant="card"
                utmCampaign="bottom_cta"
                heading="Stay protected — scam alerts delivered weekly"
                description="Verified gigs, scam breakdowns, and safe hiring tips — straight from the communities where it happens."
              />
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted">
                  <Shield className="h-5 w-5 text-brand" />
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Ready to protect your next deal?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Set up deal protection in under 60 seconds. Share the link anywhere. Freelancer keeps 100%.
                </p>
                <Link
                  href="/create"
                  className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
                >
                  Create Protected Deal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomePageContent />
    </Suspense>
  );
}
