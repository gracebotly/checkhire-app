import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "How CheckHire Works — Safe Escrow for Gig Work",
  description:
    "Create a gig, fund escrow, get paid. Learn how CheckHire protects freelancers and clients with secure escrow payments, 72-hour auto-release, and human dispute resolution.",
  alternates: { canonical: "https://checkhire.com/how-it-works" },
};

const steps = [
  {
    icon: FileText,
    title: "Post a Gig",
    description:
      "Describe the work, set your budget, and share the link with your freelancer — or post it publicly for anyone to apply.",
  },
  {
    icon: Users,
    title: "Find Your Person",
    description:
      "Share on Reddit, Facebook, Discord, or browse open gigs. Find the right freelancer without a marketplace middleman.",
  },
  {
    icon: Lock,
    title: "Fund Escrow",
    description:
      'Client pays the deal amount + 5% fee. Freelancer sees "Payment Secured" before starting any work.',
  },
  {
    icon: Briefcase,
    title: "Do the Work",
    description:
      "Freelancer delivers work and posts updates in the activity log. Both parties can communicate in one place.",
  },
  {
    icon: Zap,
    title: "Get Paid",
    description:
      "Client approves delivery or 72 hours pass — money releases automatically. Freelancer keeps 100%.",
  },
];

const comparison = [
  { platform: "CheckHire", freelancerFee: "0%", clientFee: "5%", highlight: true },
  { platform: "Upwork", freelancerFee: "10–20%", clientFee: "3.4%", highlight: false },
  { platform: "Fiverr", freelancerFee: "20%", clientFee: "5.5%", highlight: false },
  { platform: "PayPal", freelancerFee: "No escrow", clientFee: "Disputes fail for services", highlight: false },
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
              How CheckHire Works
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 md:text-lg">
              Safe escrow payments for freelance gig work. Post a gig, fund
              escrow, deliver work, get paid. Both sides protected.
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
              5% client fee. 0% freelancer fee. Cheaper than any marketplace.
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
              Post Your First Gig — It&apos;s Free
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
              Create a gig in under 3 minutes. Zero fees for freelancers.
            </p>
            <Link
              href="/login?mode=signup&redirect=/deal/new"
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
            >
              Get Started
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
