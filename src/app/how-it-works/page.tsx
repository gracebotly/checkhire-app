"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  FileText,
  Lock,
  Share2,
  CheckCircle,
  Zap,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Define the agreement",
    description:
      "The client creates a gig on CheckHire — title, deliverables, deadline, and budget. Clear terms protect both sides and make payouts automatic.",
  },
  {
    icon: Lock,
    title: "Fund escrow",
    description:
      'The client pays the gig amount plus a 5% platform fee. Funds are held securely by Stripe — not by CheckHire. The freelancer can see "Payment Secured" with the exact amount before they commit.',
  },
  {
    icon: Share2,
    title: "Share the link anywhere",
    description:
      "The client gets a unique payment link (e.g., checkhire.co/deal/abc123) and shares it on Reddit, Discord, Facebook, WhatsApp, Twitter, email, or text. The link works everywhere — no app download required.",
  },
  {
    icon: CheckCircle,
    title: "Freelancer delivers",
    description:
      "The freelancer accepts the gig with just their name and email — no CheckHire account required. As they work, they upload evidence (screenshots, files, links) to the deal's activity log. When the work is done, they mark it complete.",
  },
  {
    icon: Zap,
    title: "Funds release",
    description:
      "The client has 72 hours to confirm delivery. If they confirm — funds release to the freelancer's bank account (2 business days) or debit card (instantly). If the client doesn't respond within 72 hours — funds auto-release. No more ghost clients.",
  },
];

const comparisonRows = [
  ["Freelancer fee", "0%", "10%", "20%", "0% (no protection)"],
  ["Client cost", "~8% total", "5% + freelancer markup", "Built into inflated pricing", "0% (no protection)"],
  ["Escrow protection", "Yes — funds locked before work starts", "Yes", "Yes", "No"],
  ["Auto-release if client ghosts", "Yes — 72 hours", "No", "No", "N/A"],
  ["Dispute resolution", "Yes — human review", "Yes — platform decides", "Yes — platform decides", "Buyer protection only"],
  ["Works outside the platform", "Yes — share the link anywhere", "No — must use Upwork", "No — must use Fiverr", "Yes — but zero protection"],
  ["Freelancer gets paid exactly the posted amount", "Yes", "No — 10% deducted", "No — 20% deducted", "N/A"],
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <section className="px-6 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-display text-3xl font-bold text-slate-900 md:text-5xl">
              How CheckHire Works
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 md:text-lg">
              Create a payment link. Share it anywhere. Get paid — or get your money back.
            </p>
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-slate-900">
              From handshake to payout in five steps.
            </h2>
            <div className="grid gap-4 md:grid-cols-5">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted">
                      <Icon className="h-5 w-5 text-brand" />
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-brand">Step {index + 1}</div>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-slate-900">
              Transparent pricing. No hidden fees.
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">For Clients</h3>
                <table className="w-full text-left text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 pr-3 text-slate-600">Gig amount (what the freelancer receives)</td>
                      <td className="py-2 font-medium text-slate-900">You set this</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 pr-3 text-slate-600">CheckHire platform fee</td>
                      <td className="py-2 font-medium text-slate-900">5% of gig amount</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 pr-3 text-slate-600">Stripe payment processing</td>
                      <td className="py-2 font-medium text-slate-900">~2.9% + $0.30</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-semibold text-slate-900">Your total cost</td>
                      <td className="py-2 font-semibold text-slate-900">~7.9% above the gig amount</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-4 text-sm text-slate-600">
                  Example: You&apos;re hiring a designer for $300. The designer receives exactly $300. You pay approximately $324 total — $15 CheckHire fee + ~$9.14 Stripe processing.
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">For Freelancers</h3>
                <table className="w-full text-left text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 pr-3 text-slate-600">Your fee</td>
                      <td className="py-2 font-medium text-slate-900">$0 — you keep 100% of the posted amount</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 pr-3 text-slate-600">Standard payout (bank transfer)</td>
                      <td className="py-2 font-medium text-slate-900">Free — arrives in 2 business days</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 text-slate-600">Instant payout (debit card)</td>
                      <td className="py-2 font-medium text-slate-900">$1 or 1%, whichever is greater — arrives in seconds, 24/7</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <p className="mx-auto mt-6 max-w-4xl text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Where does the 5% go?</span> CheckHire&apos;s 5% covers the platform, dispute resolution, fraud monitoring, and the free scam investigation service. Stripe&apos;s ~2.9% + $0.30 is Stripe&apos;s standard payment processing fee — CheckHire doesn&apos;t mark it up or touch it. We show you both fees upfront because you deserve to know exactly what you&apos;re paying.
            </p>
          </div>
        </section>

        <section className="border-t border-gray-100 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 text-center font-display text-2xl font-bold text-slate-900">How CheckHire compares</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-slate-900">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Feature</th>
                    <th className="px-4 py-3 font-semibold">CheckHire</th>
                    <th className="px-4 py-3 font-semibold">Upwork</th>
                    <th className="px-4 py-3 font-semibold">Fiverr</th>
                    <th className="px-4 py-3 font-semibold">PayPal / Venmo</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row[0]} className="border-t border-gray-100 align-top">
                      {row.map((cell, i) => (
                        <td key={`${row[0]}-${i}`} className={`px-4 py-3 ${i === 0 ? "font-medium text-slate-900" : "text-slate-600"}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 px-6 py-16">
          <div className="mx-auto max-w-4xl space-y-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Built on the same infrastructure behind Shopify, Lyft, and DoorDash.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                CheckHire doesn&apos;t hold your money — Stripe does. Stripe Connect processes billions of dollars annually for platforms you already trust. Your payment card details, bank account numbers, and tax information go directly to Stripe. CheckHire never sees them.
              </p>
              <p className="mt-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">For Clients:</span> Fund escrow with Visa, Mastercard, Amex, Discover, Apple Pay, Google Pay, PayPal, Cash App Pay, or ACH bank transfer.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">For Freelancers:</span> Receive payouts to your bank account (2 business days, free) or debit card (seconds, 24/7 — including weekends and holidays).
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">How getting paid works</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                When you accept a gig on CheckHire, you go through a quick Stripe verification (1–3 minutes). Your information goes directly to Stripe — CheckHire never sees your bank details or tax information.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>Your legal name and date of birth</li>
                <li>Your address</li>
                <li>A bank account or debit card for receiving payouts</li>
                <li>Your SSN or ITIN (for 1099 tax reporting)</li>
              </ul>
              <p className="mt-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Tax reporting:</span> If you earn $600 or more through CheckHire in a calendar year, you&apos;ll receive a 1099 tax form. Stripe handles this automatically — they&apos;ll email you when your form is ready.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Already have a Stripe account?</span> The onboarding is even faster. Stripe can pre-fill your information from your existing account. You&apos;ll still create a new connected account linked to CheckHire, but the process takes under a minute.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">No CheckHire account required.</span> Freelancers can accept a gig and get paid with just their name and email. If you want to build a reputation, track your deals, and earn trust badges — create a free account.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="font-display text-2xl font-bold text-slate-900">What happens if something goes wrong</h2>
            <p className="mt-3 text-sm text-slate-600">CheckHire&apos;s dispute system is designed so both sides get a fair shot.</p>
            <p className="mt-4 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Step 1 — Self-resolution.</span> Both parties propose how they think the funds should be split (e.g., “I think 70% to freelancer, 30% refund”). If the proposals overlap, the system auto-resolves to the midpoint. Most disputes never need a human.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Step 2 — Human review.</span> If proposals don&apos;t overlap, a real person reviews the evidence timeline — every message, file upload, and system event is timestamped and permanent. A resolution is issued within 48 hours.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Dispute fee:</span> 5% of the disputed amount, charged to the party who loses the dispute. This discourages frivolous disputes while keeping the process fair.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">The evidence timeline is your protection.</span> Every action on a deal is logged with timestamps — file uploads, status changes, messages. This log is permanent and cannot be edited or deleted. The more evidence you upload during the deal, the stronger your position if a dispute ever happens.
            </p>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Ready to work with anyone online — without the risk?
            </h2>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/create"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                Create a Payment Link
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/scam-check"
                className="inline-flex items-center justify-center rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-gray-50"
              >
                Submit a Suspicious Posting for Free Investigation
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
