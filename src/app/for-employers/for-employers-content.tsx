"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  BarChart3,
  Clock,
  ShieldCheck,
  UserRoundX,
} from "lucide-react";

const benefits = [
  {
    title: "Verified Trust Badge",
    description:
      "Your listings display a verification badge that candidates trust. 83% of job seekers research company reviews before applying — your badge does the work for you.",
    icon: ShieldCheck,
  },
  {
    title: "Pseudonym-Protected Candidates",
    description:
      "Candidates apply anonymously. You evaluate skills first, names later. This means less bias, better matches, and candidates who actually want to work — not just collect applications.",
    icon: UserRoundX,
  },
  {
    title: "Transparency Score",
    description:
      "Your public transparency score shows candidates you're responsive, you actually hire, and workers have good experiences. High scores attract more applicants.",
    icon: BarChart3,
  },
  {
    title: "No Ghost Job Competition",
    description:
      "Every listing expires in 45 days. Employers must close out listings with a reason. Ghost jobs can't exist here — so your real opening doesn't get buried under fake ones.",
    icon: Clock,
  },
] as const;

const tiers = [
  {
    title: "Tier 1 — Payment Verified",
    description:
      "Route payment through the platform. Fastest setup. Highest trust. The only option for international employers.",
    badgeClass: "bg-amber-100 text-amber-700",
    cardClass: "border-amber-200",
  },
  {
    title: "Tier 2 — Identity Verified",
    description:
      "Upload a video intro + verify your ID. For employers who prefer not to pay through the platform.",
    badgeClass: "bg-blue-100 text-blue-700",
    cardClass: "border-blue-200",
  },
  {
    title: "Tier 3 — Business Verified",
    description:
      "Documentation + LinkedIn + domain verification. The most thorough checks for employers who prefer neither video nor payment.",
    badgeClass: "bg-slate-200 text-slate-700",
    cardClass: "border-slate-300",
  },
] as const;

const steps = [
  {
    title: "Create your account",
    description: "Sign up and tell us about your company. Takes 2 minutes.",
  },
  {
    title: "Choose your verification level",
    description:
      "Pick the tier that works for your company. Higher tiers get better placement.",
  },
  {
    title: "Post your listing",
    description:
      "Add job details, compensation, and optional screening questions. Free during our founding period.",
  },
  {
    title: "Review pseudonymous candidates",
    description:
      "See skills and qualifications first. Names are revealed only when candidates accept your interview request.",
  },
] as const;

export function ForEmployersContent() {
  return (
    <div className="mx-auto max-w-6xl px-6 font-sans">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="py-20 text-center"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-muted">
          <BadgeCheck className="h-6 w-6 text-brand" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-bold text-slate-900 md:text-5xl">
          Attract better candidates. Zero scam competition.
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-slate-600">
          CheckHire is the only job board where every employer is verified, every
          salary is shown, and candidates trust every listing. Your jobs don&apos;t
          compete with scams — because scams can&apos;t get in.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="cursor-pointer rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover"
          >
            Post Your First Job
          </Link>
          <Link
            href="/pricing"
            className="cursor-pointer rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold text-slate-900 transition-colors duration-200 hover:bg-gray-50"
          >
            See Pricing
          </Link>
        </div>
      </motion.section>

      <section className="pb-16">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut", delay: 0.04 }}
          className="text-center font-display text-3xl font-semibold text-slate-900"
        >
          Why Employers Choose CheckHire
        </motion.h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.article
                key={benefit.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-brand-muted p-2">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-slate-900">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="pb-16">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut", delay: 0.04 }}
          className="text-center font-display text-3xl font-semibold text-slate-900"
        >
          Three Ways to Verify
        </motion.h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {tiers.map((tier, index) => (
            <motion.article
              key={tier.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
              className={`rounded-xl border bg-white p-6 ${tier.cardClass}`}
            >
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tier.badgeClass}`}>
                {tier.title}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{tier.description}</p>
            </motion.article>
          ))}
        </div>
        <p className="mx-auto mt-5 max-w-3xl text-center text-sm text-slate-600">
          All tiers include: corporate email verification, compensation disclosure,
          45-day listing duration, in-app chat, and masked email relay.
        </p>
      </section>

      <section className="pb-16">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut", delay: 0.04 }}
          className="text-center font-display text-3xl font-semibold text-slate-900"
        >
          How It Works
        </motion.h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {steps.map((step, index) => (
            <motion.article
              key={step.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-muted font-display text-sm font-semibold text-brand">
                  {index + 1}
                </span>
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.description}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.08 }}
        className="pb-20"
      >
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <h2 className="font-display text-3xl font-semibold text-slate-900">
            Ready to hire with trust?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600">
            Join our founding employer program. Post unlimited listings for free
            while we build.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex cursor-pointer rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover"
          >
            Get Started — It&apos;s Free
          </Link>
        </div>
      </motion.section>
    </div>
  );
}
