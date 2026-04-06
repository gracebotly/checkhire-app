import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Shield,
  DollarSign,
  Lock,
  Clock,
  Camera,
  Zap,
  ArrowRight,
  FileText,
  Share2,
} from "lucide-react";
import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";

export const metadata: Metadata = {
  title: "For Creators — Never Create Content Without Payment Secured | CheckHire",
  description:
    "Stop creating content for brands that never pay. Lock payment before you start. 72-hour auto-release. Zero creator fees. Keep 100% of your rate.",
  alternates: { canonical: "https://checkhire.co/for-creators" },
};

const painPoints = [
  {
    problem: "Created the content. Never got paid.",
    detail:
      "You shot the video, edited the reel, posted it to your audience — and the brand ghosted. No contract, no leverage, no recourse.",
  },
  {
    problem: "Brand says \"we'll pay after posting.\"",
    detail:
      "That means you do all the work with zero guarantee. If they don't like it — or just don't feel like paying — you're out the time and effort.",
  },
  {
    problem: "\"We'll send payment next week\" — for 3 months.",
    detail:
      "Chasing invoices is a part-time job you didn't sign up for. Every DM follow-up chips away at the relationship and your sanity.",
  },
];

const benefits = [
  {
    icon: Lock,
    title: "Payment locked before you create",
    description:
      "The brand funds escrow before you start producing. You'll see the exact amount secured. No more \"trust me, we'll pay after.\"",
  },
  {
    icon: Clock,
    title: "72-hour auto-release",
    description:
      "After you submit your content, the brand has 72 hours to confirm. If they don't respond, payment releases to you automatically.",
  },
  {
    icon: DollarSign,
    title: "Zero creator fees — keep 100%",
    description:
      "You receive exactly your quoted rate. The brand covers all platform and processing fees. You keep every dollar.",
  },
  {
    icon: FileText,
    title: "Proof of delivery built in",
    description:
      "Upload your content as evidence directly in the deal. Screenshots, files, links — everything timestamped. If there's ever a dispute, the record speaks for itself.",
  },
  {
    icon: Share2,
    title: "One link — works everywhere",
    description:
      "Send your payment link over DM, email, or text. The brand clicks, funds, and you're protected. No app downloads, no complicated setup.",
  },
  {
    icon: Zap,
    title: "Get paid in seconds",
    description:
      "Once the brand confirms, get paid instantly to your debit card — 24/7, including weekends. No more waiting 30-60 days for a wire transfer.",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Create a payment link",
    description:
      "Describe the deliverables, set your rate, and generate a shareable link in under 2 minutes.",
  },
  {
    step: "2",
    title: "Send it to the brand",
    description:
      "Share the link via DM, email, or however you communicate. The brand funds escrow through Stripe.",
  },
  {
    step: "3",
    title: "Create and deliver",
    description:
      "Produce the content. Upload proof of delivery. The brand confirms, and payment releases to you.",
  },
];

const comparison = [
  { platform: "CheckHire", fee: "0%", note: "Brand pays all fees" },
  { platform: "Collabstr", fee: "0%", note: "But takes from the brand's budget" },
  { platform: "Fiverr", fee: "20%", note: "From every payment" },
  { platform: "Upwork", fee: "10–20%", note: "Sliding scale" },
];

export default function ForCreatorsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted">
              <Camera className="h-7 w-7 text-brand" />
            </div>
            <h1 className="font-display text-3xl font-bold text-slate-900 md:text-5xl">
              Never Create Content Without{" "}
              <span className="text-brand">Payment Secured</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 md:text-lg">
              Stop chasing brands for money. Lock payment before you start
              producing. Keep 100% of your rate. Get paid in seconds.
            </p>
            <Link
              href="/create"
              className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
            >
              Create Your Payment Link
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-xs text-slate-600">
              Free to create. No account needed to start.
            </p>
          </div>
        </section>

        {/* Pain Points */}
        <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-3 text-center font-display text-2xl font-bold text-slate-900">
              Sound Familiar?
            </h2>
            <p className="mx-auto mb-10 max-w-lg text-center text-sm text-slate-600">
              If you&apos;ve ever created content for a brand and didn&apos;t get
              paid, you&apos;re not alone. It happens every day.
            </p>
            <div className="space-y-4">
              {painPoints.map((p) => (
                <div
                  key={p.problem}
                  className="rounded-xl border border-gray-200 bg-white p-5"
                >
                  <h3 className="text-sm font-semibold text-slate-900">
                    &ldquo;{p.problem}&rdquo;
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {p.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-center font-display text-2xl font-bold text-slate-900">
              How It Works
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {howItWorks.map((s) => (
                <div key={s.step} className="text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand font-display text-sm font-bold text-white">
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

        {/* Benefits */}
        <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-center font-display text-2xl font-bold text-slate-900">
              Built for Creators
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

        {/* Comparison */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-md">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-slate-900">
              What Creators Pay on Other Platforms
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
                  <div>
                    <span
                      className={`text-sm font-medium ${
                        row.platform === "CheckHire"
                          ? "text-brand"
                          : "text-slate-900"
                      }`}
                    >
                      {row.platform}
                    </span>
                    <p
                      className={`text-xs ${
                        row.platform === "CheckHire"
                          ? "text-brand/70"
                          : "text-slate-600"
                      }`}
                    >
                      {row.note}
                    </p>
                  </div>
                  <span
                    className={`font-mono tabular-nums text-sm font-semibold ${
                      row.platform === "CheckHire"
                        ? "text-brand"
                        : "text-slate-600"
                    }`}
                  >
                    {row.fee}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof / Trust */}
        <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <Shield className="mx-auto mb-4 h-8 w-8 text-brand" />
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Your Work Has Value. Protect It.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
              Every brand deal you take without payment protection is a gamble.
              CheckHire makes it simple: if the money isn&apos;t locked, don&apos;t
              start creating. Your content is worth more than a promise.
            </p>
          </div>
        </section>

        {/* Newsletter */}
        <section className="px-6 py-12">
          <div className="mx-auto max-w-4xl">
            <NewsletterSignup
              variant="card"
              utmCampaign="for_creators"
              heading="Creator safety tips — weekly"
              description="How to vet brands, structure deals, and make sure you always get paid. Free newsletter for creators."
            />
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Ready to stop working for free?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
              Create a payment link in under 2 minutes. Send it to the brand
              before you start creating. Keep 100% of your rate.
            </p>
            <Link
              href="/create"
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
            >
              Create Your Payment Link
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
