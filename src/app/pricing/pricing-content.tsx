"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, Check, Infinity, Zap } from "lucide-react";

const pricingPlans = [
  {
    name: "Gig & Temp Jobs",
    icon: Zap,
    price: "Free to post",
    suffix: "",
    subtitle: "5% platform fee on completed work",
    features: [
      "Mandatory escrow protection",
      "Verified employer badges",
      "45-day listing duration",
      "Up to 200 applications",
      "In-app chat + masked email",
    ],
    note: "Escrow funded after candidate selection — not at listing time",
    highlighted: false,
    popular: false,
  },
  {
    name: "Full-Time & Salaried",
    icon: Building2,
    price: "$150",
    suffix: "/listing",
    subtitle: "One-time fee per 45-day listing",
    features: [
      "All verification tiers available",
      "Transparency score + trust badges",
      "Pseudonym-protected candidates",
      "Screening quizzes + video apps",
      "In-app chat + masked email",
      "45-day auto-expiration",
    ],
    note: "Free during Founding Employer period",
    highlighted: true,
    popular: true,
  },
  {
    name: "Unlimited Listings",
    icon: Infinity,
    price: "$499",
    suffix: "/month",
    subtitle: "For verified high-volume employers",
    features: [
      "Everything in Full-Time plan",
      "Unlimited active listings",
      "Tier 3 (Business Verified) required",
      "Priority support",
      "Transparency score monitoring",
    ],
    note: "Coming soon — available after founding period",
    highlighted: false,
    popular: false,
  },
] as const;

const faqs = [
  {
    question: "What's included in the founding employer program?",
    answer:
      "During our founding period, all verified employers can post listings at no cost. The only requirement is passing our verification process. This lets you experience the full platform while we build our candidate base.",
  },
  {
    question: "When will paid pricing begin?",
    answer:
      "We'll introduce paid listings once we've built a strong base of active job seekers. Founding employers will be grandfathered with extended free access. We'll give at least 30 days notice before any pricing changes.",
  },
  {
    question: "How does gig escrow work?",
    answer:
      "When you select a candidate for a gig, you deposit the full payment into escrow through Stripe. The worker sees 'Funds Secured' before starting. When work is complete, you confirm and funds are released. CheckHire takes a 5% platform fee.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Listings are one-time purchases with no recurring commitment. The $499/month unlimited plan can be cancelled anytime with no penalty.",
  },
] as const;

export function PricingContent() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 font-sans">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="text-center"
      >
        <h1 className="font-display text-3xl font-bold text-slate-900 md:text-4xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-3 text-base text-slate-600">
          No hidden fees. No contracts. Pay only when you&apos;re ready.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.04 }}
        className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6"
      >
        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Currently Active
        </span>
        <h2 className="mt-3 font-display text-2xl font-semibold text-slate-900">
          Founding Employer Program
        </h2>
        <p className="mt-2 text-slate-600">
          We&apos;re onboarding a limited number of verified employers at no cost.
          Every employer is manually vetted. Post unlimited listings for free
          during our founding period.
        </p>
        <Link
          href="/signup"
          className="mt-5 inline-flex cursor-pointer items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover"
        >
          Apply as Founding Employer
        </Link>
      </motion.section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {pricingPlans.map((plan, index) => {
          const Icon = plan.icon;

          return (
            <motion.article
              key={plan.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
              className={`rounded-xl bg-white p-5 ${
                plan.highlighted ? "border-2 border-brand" : "border border-gray-200"
              }`}
            >
              {plan.popular ? (
                <div className="mb-3 inline-flex rounded-full bg-brand-muted px-3 py-1 text-xs font-semibold text-brand">
                  Most Popular
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-brand" />
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  {plan.name}
                </h3>
              </div>
              <div className="mt-3 flex items-end gap-1">
                <p className="font-display text-3xl font-bold text-slate-900">
                  {plan.price}
                </p>
                {plan.suffix ? <p className="mb-1 text-sm text-slate-600">{plan.suffix}</p> : null}
              </div>
              <p className="mt-1 text-sm text-slate-600">{plan.subtitle}</p>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-900">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-4 border-t border-gray-100 pt-4 text-xs text-slate-600">
                {plan.note}
              </p>
            </motion.article>
          );
        })}
      </section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.12 }}
        className="mt-10"
      >
        <h2 className="font-display text-2xl font-semibold text-slate-900">FAQ</h2>
        <div className="mt-4 space-y-3">
          {faqs.map((item, index) => (
            <details
              key={item.question}
              className="rounded-xl border border-gray-200 bg-white p-5"
              open={index === 0}
            >
              <summary className="cursor-pointer list-none font-display text-base font-semibold text-slate-900">
                {item.question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
