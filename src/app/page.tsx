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
        {/* 1. Hero */}
        <motion.section className="px-6 py-20 md:py-28" {...section(0)}>
          <div className="mx-auto max-w-6xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-brand-muted bg-brand-muted px-4 py-1.5">
              <Shield className="h-4 w-4 text-brand" />
              <span className="text-xs font-semibold text-brand">
                ESCROW-PROTECTED PAYMENTS
              </span>
            </div>

            <h1 className="font-display text-3xl font-bold text-slate-900 md:text-5xl md:leading-tight">
              The payment link that{" "}
              <span className="text-brand">protects both sides.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-base text-slate-600 md:text-lg">
              Create an escrow payment link in under 3 minutes. Share it
              anywhere. Freelancer keeps 100%.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/create"
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
              >
                Create a Payment Link — Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="cursor-pointer rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors duration-200 hover:bg-gray-50"
              >
                How It Works
              </a>
            </div>

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

        {/* 2. Fee Calculator */}
        <motion.section className="px-6 py-16" {...section(0.04)}>
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-slate-900">
              Know exactly what you&apos;ll pay
            </h2>
            <div className="mx-auto max-w-md">
              <FeeCalculator />
            </div>
          </div>
        </motion.section>

        {/* 3. How It Works */}
        <motion.section
          id="how-it-works"
          className="px-6 py-16"
          {...section(0.08)}
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

        {/* 3.5. Instant Payout Callout */}
        <motion.section className="px-6 py-16" {...section(0.10)}>
          <div className="mx-auto max-w-6xl grid gap-8 md:grid-cols-2 items-center">
            <div>
              <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 mb-4">
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

        {/* 4. Payment Methods */}
        <motion.section className="px-6 py-10" {...section(0.14)}>
          <div className="mx-auto max-w-6xl">
            <p className="mb-6 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
              We accept
            </p>
            <PaymentMethodsBar variant="full" />
          </div>
        </motion.section>

        {/* 5. Value Props */}
        <motion.section
          className="border-t border-gray-100 bg-gray-50 px-6 py-16"
          {...section(0.18)}
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
                Zero freelancer fees. The client covers all fees.
                Freelancer receives exactly the posted amount.
              </p>
            </div>
          </div>
        </motion.section>

        {/* 6. Final CTA + Newsletter */}
        <motion.section className="px-6 py-16" {...section(0.22)}>
          <div className="mx-auto max-w-6xl">
            <div className="grid items-start gap-8 md:grid-cols-2">
              <div className="text-center md:text-left">
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  Ready to get started?
                </h2>
                <p className="mt-3 max-w-lg text-sm text-slate-600">
                  Create your first payment link in under 2 minutes. No fees for
                  freelancers, ever.
                </p>
                <Link
                  href="/create"
                  className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
                >
                  Create a Payment Link — Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <NewsletterSignup
                variant="card"
                utmCampaign="bottom_cta"
                heading="Not ready yet?"
                description="Get weekly scam teardowns and gig safety tips from real Reddit posts."
              />
            </div>
          </div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
}
