import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Shield,
  Lock,
  Users,
  Clock,
  Layers,
  DollarSign,
  ArrowRight,
  FileText,
} from "lucide-react";

export const metadata: Metadata = {
  title: "For Clients — Hire with Confidence | CheckHire",
  description:
    "Funds locked before work starts. Dispute resolution by real humans. 72-hour review period. Milestone payments. Safe escrow for gig work.",
  alternates: { canonical: "https://checkhire.com/for-clients" },
};

const benefits = [
  {
    icon: Lock,
    title: "Funds locked before work starts",
    description:
      "Your payment is held in escrow. It only releases when you confirm delivery or the 72-hour review window passes.",
  },
  {
    icon: Users,
    title: "Human dispute resolution",
    description:
      "If something goes wrong, a real person reviews evidence from both sides within 48 hours and makes a binding decision.",
  },
  {
    icon: Clock,
    title: "72-hour review period",
    description:
      "After work is submitted, you have 72 hours to review, request revisions, or confirm delivery. No rushed decisions.",
  },
  {
    icon: Layers,
    title: "Milestone payments",
    description:
      "Break larger projects into milestones. Pay as each phase is completed. Only release funds for approved work.",
  },
  {
    icon: DollarSign,
    title: "Only 5% — cheaper than any marketplace",
    description:
      "A flat 5% platform fee on escrow funding. No hidden costs, no subscription fees, no per-message charges.",
  },
];

const steps = [
  {
    step: "1",
    title: "Describe the gig",
    description: "Title, deliverables, budget, deadline. Takes under 2 minutes.",
  },
  {
    step: "2",
    title: "Share the link",
    description:
      "Send the deal link to your freelancer, or post it publicly for applications.",
  },
  {
    step: "3",
    title: "Fund escrow",
    description:
      "Pay via Stripe. Your freelancer sees the funds are secured before starting.",
  },
];

export default function ForClientsPage() {
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
              Hire with Confidence
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 md:text-lg">
              Your money is protected. Funds are locked before work starts, and
              you control when they release. Dispute resolution by real humans.
            </p>
            <Link
              href="/login?mode=signup&redirect=/deal/new"
              className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
            >
              Post a Gig — It&apos;s Free to Start
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Benefits */}
        <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-center font-display text-2xl font-bold text-slate-900">
              Only Pay for What You Get
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
          </div>
        </section>

        {/* How to Post */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-center font-display text-2xl font-bold text-slate-900">
              Post a Gig in Under 3 Minutes
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.step} className="text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white font-display font-bold text-sm">
                    {s.step}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Ready to hire safely?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
              Post a gig in under 3 minutes. Your freelancer sees the payment is
              secured before they start.
            </p>
            <Link
              href="/login?mode=signup&redirect=/deal/new"
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
            >
              Post a Gig — It&apos;s Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
