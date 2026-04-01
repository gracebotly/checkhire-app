import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Shield,
  DollarSign,
  Lock,
  Clock,
  Award,
  Zap,
  ArrowRight,
} from "lucide-react";
import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";
import { PayoutSpeedComparison } from "@/components/gig/PayoutSpeedComparison";

export const metadata: Metadata = {
  title: "For Freelancers — Keep 100% of What You Earn | CheckHire",
  description:
    "Zero freelancer fees. Payment guaranteed before work starts. 72-hour auto-release. Build your trust reputation. Get paid in minutes with instant payouts.",
  alternates: { canonical: "https://checkhire.com/for-freelancers" },
};

const benefits = [
  {
    icon: DollarSign,
    title: "Zero fees — ever",
    description:
      "You receive exactly the posted amount. The client covers all platform and processing fees. You keep 100%.",
  },
  {
    icon: Zap,
    title: "Instant payouts — under 30 minutes",
    description:
      "Get paid to your debit card in under 30 minutes, 24/7 — including weekends and holidays. Other platforms make you wait 7-14 days. Optional 1% fee (min $0.50).",
  },
  {
    icon: Lock,
    title: "Payment guaranteed",
    description:
      'Funds are locked in escrow before you start any work. You\'ll see "Payment Secured" with the exact amount held for you.',
  },
  {
    icon: Clock,
    title: "72-hour auto-release",
    description:
      "If the client doesn't respond within 72 hours after you submit work, funds release to you automatically. No more ghost clients.",
  },
  {
    icon: Award,
    title: "Build your reputation",
    description:
      "Completed gigs earn you trust badges: Trusted, Established, Verified. Clients can see your track record.",
  },
];

const comparison = [
  { platform: "CheckHire", fee: "0%" },
  { platform: "Upwork", fee: "10–20%" },
  { platform: "Fiverr", fee: "20%" },
];

export default function ForFreelancersPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted">
              <DollarSign className="h-7 w-7 text-brand" />
            </div>
            <h1 className="font-display text-3xl font-bold text-slate-900 md:text-5xl">
              Keep 100% of What You Earn
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 md:text-lg">
              No freelancer fees. Payment locked before work starts. 72-hour
              auto-release. Build your trust reputation and get paid in minutes.
            </p>
            <Link
              href="/login?mode=signup"
              className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
            >
              Create Your Free Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Benefits */}
        <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-center font-display text-2xl font-bold text-slate-900">
              Why Freelancers Choose CheckHire
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {benefits.map((b) => {
                const Icon = b.icon;
                return (
                  <div
                    key={b.title}
                    className="rounded-xl border border-gray-200 bg-white p-5"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted">
                      <Icon className="h-5 w-5 text-brand" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {b.title}
                    </h3>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="mt-10 mx-auto max-w-md">
              <PayoutSpeedComparison />
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-md">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-slate-900">
              How It Compares
            </h2>
            <div className="space-y-3">
              {comparison.map((row) => (
                <div
                  key={row.platform}
                  className={`flex items-center justify-between rounded-xl border p-4 ${
                    row.platform === "CheckHire"
                      ? "border-brand bg-brand-muted"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      row.platform === "CheckHire"
                        ? "text-brand"
                        : "text-slate-900"
                    }`}
                  >
                    {row.platform}
                  </span>
                  <span
                    className={`font-mono tabular-nums text-sm font-semibold ${
                      row.platform === "CheckHire"
                        ? "text-brand"
                        : "text-slate-600"
                    }`}
                  >
                    {row.fee} freelancer fee
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <Shield className="mx-auto mb-4 h-8 w-8 text-brand" />
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Build Your Trust Profile
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
              Every completed gig builds your reputation. Earn trust badges that
              signal reliability to future clients: <strong>Trusted</strong>{" "}
              after 3 gigs, <strong>Established</strong> after 10,{" "}
              <strong>Verified</strong> after 25.
            </p>
          </div>
        </section>

        {/* Newsletter */}
        <section className="px-6 py-12">
          <div className="mx-auto max-w-4xl">
            <NewsletterSignup
              variant="card"
              utmCampaign="for_freelancers"
              heading="Never get scammed again"
              description="Weekly scam teardowns from real Reddit posts. Learn the red flags so you can spot them before they cost you."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Start earning with zero fees
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
              Create your account in 30 seconds. Browse open gigs or accept a
              deal link from a client.
            </p>
            <Link
              href="/login?mode=signup"
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
            >
              Create Your Free Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
