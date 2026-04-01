"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";
import { FeeCalculator } from "@/components/gig/FeeCalculator";
import { PaymentMethodsBar } from "@/components/gig/PaymentMethodsBar";
import { PayoutSpeedComparison } from "@/components/gig/PayoutSpeedComparison";
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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* 1. Hero — Email Capture First */}
        <motion.section className="px-6 py-20 md:py-28" {...section(0)}>
          <div className="mx-auto max-w-6xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-brand-muted bg-brand-muted px-4 py-1.5">
              <Shield className="h-4 w-4 text-brand" />
              <span className="text-xs font-semibold text-brand">
                ESCROW-PROTECTED PAYMENTS
              </span>
            </div>

            <h1 className="font-display text-3xl font-bold text-slate-900 md:text-5xl md:leading-tight">
              Stop getting scammed{" "}
              <span className="text-brand">hiring online.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-base text-slate-600 md:text-lg">
              Get verified gig postings, scam alerts, and safe hiring tips
              delivered weekly — straight from the communities where it
              happens.
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
              Free weekly newsletter. No spam. Unsubscribe anytime.
            </p>

            {/* Secondary link — not a big CTA button */}
            <p className="mt-6 text-sm text-slate-600">
              Already know CheckHire?{" "}
              <Link
                href="/create"
                className="cursor-pointer font-semibold text-brand transition-colors duration-200 hover:text-brand-hover"
              >
                Create a payment link
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
                <p className="mt-0.5 text-xs text-slate-600">Auto-release</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="text-center">
                <p className="font-mono text-xl font-bold tabular-nums text-brand">
                  100%
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  You keep it all
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
                Join the safest hiring community on Reddit
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Every hiring post on r/checkhire is backed by locked escrow
                money or a verified video. No unverified posts.
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

        {/* 3. How It Works */}
        <motion.section
          id="how-it-works"
          className="px-6 py-16"
          {...section(0.04)}
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-10 text-center font-display text-2xl font-bold text-slate-900">
              How It Works
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                  <FileText className="h-5 w-5 text-brand" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Create a payment link
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Describe the gig, set the price. Get a shareable escrow link
                  in seconds.
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
                  Reddit, Facebook, Discord, WhatsApp, email, text — your link
                  works everywhere.
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
                  Get paid safely
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Freelancer delivers, you confirm, money releases. Or it
                  auto-releases in 72 hours.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* 4. Fee Calculator */}
        <motion.section className="px-6 py-16" {...section(0.06)}>
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-slate-900">
              Know exactly what you&apos;ll pay
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
                FAST PAYOUTS
              </span>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Get paid in minutes, not weeks.
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Other platforms make you wait 7–14 days for your money. CheckHire
                freelancers get paid the moment work is approved.
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
                Funds locked before work starts
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Client pays into escrow. Freelancer sees &ldquo;Payment
                Secured&rdquo; with the exact amount held for them.
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
                Client has 72 hours to review delivered work. No response? Funds
                release automatically. No more ghost clients.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                <DollarSign className="h-5 w-5 text-brand" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Freelancer keeps 100%
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Zero freelancer fees. The client covers all fees. Freelancer
                receives exactly the posted amount.
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
                heading="Get verified gig postings weekly"
                description="Escrow-backed gigs, scam alerts, and safe hiring tips — delivered to your inbox every week."
              />
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted">
                  <Shield className="h-5 w-5 text-brand" />
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Ready to create a payment link?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Fund escrow in under 3 minutes. Share the link anywhere. The
                  freelancer keeps 100%.
                </p>
                <Link
                  href="/create"
                  className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
                >
                  Create Payment Link
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
