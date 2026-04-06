import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScamCheckForm } from "@/components/scam-check/ScamCheckForm";
import { Shield, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Free Scam Investigation — Submit a Suspicious Posting | CheckHire",
  description:
    "Found a suspicious job posting on Reddit, Facebook, LinkedIn, or anywhere online? Submit the link and our team investigates it for free.",
  alternates: { canonical: "https://checkhire.co/scam-check" },
};

export default function ScamCheckPage() {
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
              Free Scam Investigation
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 md:text-lg">
              Found a suspicious job posting? Paste the link below — our team
              investigates it and sends you the results for free.
            </p>

            {/* Scam Check Form */}
            <div className="mx-auto mt-8 max-w-lg">
              <ScamCheckForm />
            </div>
          </div>
        </section>

        {/* What We Check */}
        <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-slate-900">
              What We Look For
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Account verification
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Is the poster&apos;s account new or aged? Do they have history
                  outside hiring communities? Scammers often use freshly
                  created or purchased accounts.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Company verification
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Does the company they claim to represent actually exist? Is
                  this role listed on their real careers page? We
                  cross-reference everything.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Red flag patterns
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Vague job descriptions, copy-pasted text, requests for
                  upfront payment, crypto-only payment methods, requests for
                  personal info before any work is agreed on.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Payment protection refusal
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  If someone refuses any form of payment protection or escrow
                  for work they&apos;re commissioning, that&apos;s one of the
                  strongest signals something isn&apos;t right.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Want to skip the risk entirely?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
              Create a payment link and lock funds in escrow before any work
              starts. If the other party won&apos;t put money up, that tells you
              everything.
            </p>
            <Link
              href="/create"
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
            >
              Create a Payment Link
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
