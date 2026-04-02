"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Shield,
  FileText,
  Users,
  Lock,
  Briefcase,
  Zap,
  ArrowRight,
  AlertTriangle,
  Scale,
} from "lucide-react";
import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";
import { FeeCalculator } from "@/components/gig/FeeCalculator";
import { WaysToGetPaid } from "@/components/gig/WaysToGetPaid";
import { StripeOnboardingExplainer } from "@/components/gig/StripeOnboardingExplainer";
import { PayoutSpeedComparison } from "@/components/gig/PayoutSpeedComparison";
import { motion } from "motion/react";

const steps = [
  {
    icon: FileText,
    title: "Define the Deal",
    description:
      "Describe the work, set your budget and deadline. Be specific — clear expectations prevent disputes before they happen.",
  },
  {
    icon: Users,
    title: "Find Your Person",
    description:
      "Share on Reddit, Facebook, Discord, or browse open gigs. Work with anyone — no marketplace middleman required.",
  },
  {
    icon: Lock,
    title: "Secure the Payment",
    description:
      'Client funds the deal. Freelancer sees "Payment Secured" with the exact amount locked. Nobody starts work on faith.',
  },
  {
    icon: Briefcase,
    title: "Do the Work",
    description:
      "Freelancer delivers and uploads evidence along the way. Everything is documented — this is your paper trail if anything goes wrong.",
  },
  {
    icon: Zap,
    title: "Release with Confidence",
    description:
      "Client confirms delivery — or 72 hours pass and funds auto-release. Freelancer keeps 100%. No more ghost clients.",
  },
];

const comparison = [
  { platform: "CheckHire", freelancerFee: "0%", clientFee: "~7.9% + $0.30", payoutSpeed: "30 min or 2 days", highlight: true },
  { platform: "Upwork", freelancerFee: "10–20%", clientFee: "3.4%", payoutSpeed: "7–10 business days", highlight: false },
  { platform: "Fiverr", freelancerFee: "20%", clientFee: "5.5%", payoutSpeed: "Up to 14 days", highlight: false },
  { platform: "PayPal", freelancerFee: "No escrow", clientFee: "N/A", payoutSpeed: "Instant (no protection)", highlight: false },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted">
              <Shield className="h-7 w-7 text-brand" />
            </div>
            <h1 className="font-display text-3xl font-bold text-slate-900 md:text-5xl">
              How Deal Protection Works
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 md:text-lg">
              Define the work. Secure the payment. Release with confidence. Both sides protected from scams, ghosting, and broken promises.
            </p>
          </div>
        </section>

        {/* 5-Step Flow */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-5 md:gap-4">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                      <Icon className="h-5 w-5 text-brand" />
                    </div>
                    <div className="mb-1 text-xs font-semibold text-brand uppercase tracking-wider">
                      Step {i + 1}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Fee Calculator */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-slate-900">
              Know exactly what you&apos;ll pay
            </h2>
            <div className="mx-auto max-w-md">
              <FeeCalculator />
            </div>
          </div>
        </section>

        {/* Full Pricing Breakdown */}
        <section className="px-6 py-16 border-t border-gray-100">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-3 text-center font-display text-2xl font-bold text-slate-900">
              Pricing — No Hidden Fees
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-center text-sm text-slate-600">
              Here&apos;s exactly what every transaction costs. No surprises.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Client fees */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="font-semibold text-slate-900 mb-4">What clients pay</h3>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm text-slate-600">Gig amount</span>
                    <span className="text-sm font-mono tabular-nums text-slate-900">Set by you</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm text-slate-600">CheckHire platform fee</span>
                    <span className="text-sm font-mono tabular-nums text-slate-900">5%</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm text-slate-600">Stripe card processing</span>
                    <span className="text-sm font-mono tabular-nums text-slate-600">2.9% + $0.30</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm text-slate-600">International cards</span>
                    <span className="text-sm font-mono tabular-nums text-slate-600">+1.5% if applicable</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-sm font-semibold text-slate-900">Effective total (US cards)</span>
                    <span className="text-sm font-semibold font-mono tabular-nums text-slate-900">~7.9% + $0.30</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  The 2.9% + $0.30 is Stripe&apos;s standard fee. CheckHire does not mark this up.
                </p>
              </div>

              {/* Freelancer fees */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="font-semibold text-slate-900 mb-4">What freelancers pay</h3>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm text-slate-600">Platform fee</span>
                    <span className="text-sm font-mono tabular-nums text-green-600 font-semibold">$0 — always</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm text-slate-600">Standard payout (2 days)</span>
                    <span className="text-sm font-mono tabular-nums text-green-600 font-semibold">Free</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm text-slate-600">Instant payout (30 min)</span>
                    <span className="text-sm font-mono tabular-nums text-slate-900">1% (min $0.50)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Dispute fee (if you lose)</span>
                    <span className="text-sm font-mono tabular-nums text-slate-600">5% of disputed amount</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  Freelancers receive exactly the posted gig amount. Instant payout is optional.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Payout Options */}
        <section className="px-6 py-16 border-t border-gray-100">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-slate-900">
              How freelancers get paid
            </h2>
            <WaysToGetPaid />
            <div className="mt-8 mx-auto max-w-md">
              <PayoutSpeedComparison />
            </div>
          </div>
        </section>

        {/* What Stripe Needs */}
        <section className="px-6 py-10">
          <div className="mx-auto max-w-4xl">
            <StripeOnboardingExplainer />
          </div>
        </section>

        {/* Dispute Resolution */}
        <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  What if something goes wrong?
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Either party can open a dispute at any time. Here&apos;s what
                  happens:
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <Scale className="mb-3 h-5 w-5 text-brand" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Funds freeze instantly
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  The moment a dispute is opened, all funds are frozen. No one
                  can withdraw until it&apos;s resolved.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <FileText className="mb-3 h-5 w-5 text-brand" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Both sides submit evidence
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Upload screenshots, files, screen recordings, and written
                  descriptions. 48-hour evidence window.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <Users className="mb-3 h-5 w-5 text-brand" />
                <h3 className="text-sm font-semibold text-slate-900">
                  A real human reviews
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Within 48 hours, a human reviews all evidence and makes a
                  binding decision: release, refund, or split.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Cost Comparison */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-slate-900">
              What does it cost?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-center text-sm text-slate-600">
              5% platform fee + Stripe processing. 0% freelancer fee. Full transparency.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-left font-semibold text-slate-900">
                      Platform
                    </th>
                    <th className="pb-3 text-left font-semibold text-slate-900">
                      Freelancer Fee
                    </th>
                    <th className="pb-3 text-left font-semibold text-slate-900">
                      Client Fee
                    </th>
                    <th className="pb-3 text-left font-semibold text-slate-900">
                      Payout Speed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr
                      key={row.platform}
                      className={`border-b border-gray-100 ${
                        row.highlight ? "bg-brand-muted" : ""
                      }`}
                    >
                      <td className="py-3 font-medium text-slate-900">
                        {row.platform}
                      </td>
                      <td
                        className={`py-3 ${
                          row.highlight
                            ? "font-semibold text-brand"
                            : "text-slate-600"
                        }`}
                      >
                        {row.freelancerFee}
                      </td>
                      <td className="py-3 text-slate-600">{row.clientFee}</td>
                      <td className="py-3 text-slate-600">{row.payoutSpeed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Protect Your First Deal — It Takes 60 Seconds
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
              Define the work, lock the payment, share the link. Both sides protected from day one.
            </p>
            <Link
              href="/login?mode=signup&redirect=/deal/new"
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
            >
              Create Protected Deal
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
        {/* Newsletter */}
        <section className="px-6 py-12 border-t border-gray-100">
          <div className="mx-auto max-w-4xl">
            <NewsletterSignup
              variant="inline"
              utmCampaign="how_it_works"
              heading="Stay updated"
              description="New features, safety tips, and community updates. No spam, ever."
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
