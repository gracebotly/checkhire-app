import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, ArrowRight, Lock, Clock, DollarSign, FileText, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="px-6 py-20 md:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted">
              <Shield className="h-7 w-7 text-brand" />
            </div>
            <h1 className="font-display text-3xl font-bold text-slate-900 md:text-5xl">
              Safe escrow for gig work
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 md:text-lg">
              You found each other. We make sure nobody gets screwed. Create a
              deal, fund escrow, and release payment when work is complete.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/login?mode=signup"
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
              >
                Post a Gig — It&apos;s Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="cursor-pointer rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors duration-200 hover:bg-gray-50"
              >
                How It Works
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-center font-display text-2xl font-bold text-slate-900">
              How It Works
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                  <FileText className="h-5 w-5 text-brand" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Post a gig
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Describe the work, set the price, and share the link with your
                  freelancer.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                  <Lock className="h-5 w-5 text-brand" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Fund escrow
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Payment is held securely. Freelancer sees &ldquo;Payment
                  Secured&rdquo; before starting work.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                  <Zap className="h-5 w-5 text-brand" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Get paid
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Work gets delivered, payment gets released. Freelancer keeps
                  100%.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Value props */}
        <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                <Lock className="h-5 w-5 text-brand" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Funds locked before work starts
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Client pays into escrow. Freelancer sees &ldquo;Payment Secured&rdquo;
                with the exact amount held for them.
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
                Zero freelancer fees. The client pays a 5% platform fee.
                Freelancer receives exactly the posted amount.
              </p>
            </div>
          </div>
        </section>
        {/* Final CTA */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Ready to get started?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
              Create your first gig in under 2 minutes. No fees for
              freelancers, ever.
            </p>
            <Link
              href="/deal/new"
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
