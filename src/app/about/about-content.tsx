"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Link2,
  Shield,
  Scale,
  Clock,
  DollarSign,
  Users,
  ArrowRight,
} from "lucide-react";

const differentiators = [
  {
    title: "A payment link, not a marketplace",
    description:
      "CheckHire is not a job board. You find each other wherever you already are — Reddit, Discord, Facebook, WhatsApp, Twitter, email. We give you a payment link that locks funds in escrow before work starts. Share it anywhere a URL works.",
    icon: Link2,
  },
  {
    title: "Self-service dispute resolution",
    description:
      "If something goes wrong, both parties propose a resolution split. If proposals overlap, money moves instantly — no human needed. Only if two rounds of negotiation fail does it escalate to review. Most platforms route every dispute to a human. We let you handle it yourselves first.",
    icon: Scale,
  },
  {
    title: "72-hour auto-release",
    description:
      "When the freelancer submits their work, the client has 72 hours to confirm delivery or open a dispute. If they do nothing, funds auto-release to the freelancer. No more ghost clients sitting on your money.",
    icon: Clock,
  },
] as const;

const stats = [
  {
    value: "$0",
    label: "freelancer fees — the client covers everything",
  },
  {
    value: "72hrs",
    label: "auto-release protects freelancers from ghost clients",
  },
  {
    value: "46+",
    label: "countries supported via Stripe Connect payouts",
  },
] as const;

export function AboutContent() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 font-sans">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <h1 className="font-display text-3xl font-bold text-slate-900 md:text-4xl">
          We built CheckHire because strangers shouldn&apos;t have to trust each
          other with money.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Every day, millions of people hire freelancers through Reddit, Discord,
          Facebook groups, and WhatsApp. The work gets done over DMs. The payment
          happens on faith. And when it goes wrong — ghosting, scams,
          disappearing clients — there&apos;s no recourse. CheckHire exists to
          fix that. We built an escrow payment link that works everywhere you
          find each other.
        </p>
      </motion.section>

      {/* What Makes Us Different */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.04 }}
        className="mt-12"
      >
        <h2 className="font-display text-2xl font-semibold text-slate-900">
          What Makes Us Different
        </h2>
        <div className="mt-4 space-y-4">
          {differentiators.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  ease: "easeOut",
                  delay: index * 0.04,
                }}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-brand-muted p-2">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </motion.section>

      {/* Stats */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.08 }}
        className="mt-12"
      >
        <h2 className="font-display text-2xl font-semibold text-slate-900">
          By the Numbers
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.value}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.25,
                ease: "easeOut",
                delay: index * 0.04,
              }}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <p className="font-display text-3xl font-bold text-slate-900">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-slate-600">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* How It Works (mini) */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.12 }}
        className="mt-12 rounded-xl border border-gray-200 bg-white p-6"
      >
        <h2 className="font-display text-2xl font-semibold text-slate-900">
          How It Works
        </h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted font-mono text-xs font-semibold text-brand">
              1
            </span>
            <span>
              <strong className="text-slate-900">Client creates a gig</strong>{" "}
              — title, description, deliverables, budget, and deadline.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted font-mono text-xs font-semibold text-brand">
              2
            </span>
            <span>
              <strong className="text-slate-900">Client funds escrow</strong>{" "}
              — pay with card, Apple Pay, Google Pay, PayPal, or bank transfer.
              5% fee from the client. Freelancer pays nothing.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted font-mono text-xs font-semibold text-brand">
              3
            </span>
            <span>
              <strong className="text-slate-900">Share the link anywhere</strong>{" "}
              — Reddit, Discord, WhatsApp, Facebook, Twitter, email, text.
              Freelancer clicks, accepts with just an email. No account needed.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted font-mono text-xs font-semibold text-brand">
              4
            </span>
            <span>
              <strong className="text-slate-900">Work gets done</strong>{" "}
              — freelancer uploads evidence as they go, building a paper trail.
              Marks work complete when finished.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted font-mono text-xs font-semibold text-brand">
              5
            </span>
            <span>
              <strong className="text-slate-900">Payment releases</strong>{" "}
              — client confirms delivery and funds go to the freelancer. If client
              ghosts, funds auto-release after 72 hours.
            </span>
          </li>
        </ol>
      </motion.section>

      {/* Community */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.16 }}
        className="mt-12 rounded-xl border border-gray-200 bg-white p-6"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-brand-muted p-2">
            <Users className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold text-slate-900">
              The Community
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              We also run{" "}
              <a
                href="https://reddit.com/r/checkhire"
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer font-semibold text-brand transition-colors duration-200 hover:text-brand-hover"
              >
                r/checkhire
              </a>{" "}
              — the first hiring subreddit where every job poster is verified.
              Every hiring post must be backed by locked escrow money or a video
              of the poster. No unverified posts get through. Scammers
              won&apos;t put up real money or show their face, so they go
              somewhere else.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Mission */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.2 }}
        className="mt-12 rounded-xl border border-gray-200 bg-white p-6"
      >
        <h2 className="font-display text-2xl font-semibold text-slate-900">
          Our Mission
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          CheckHire exists to make safe transactions between strangers as easy
          as sharing a link. We believe every freelancer deserves to see locked
          funds before starting work, every client deserves refund protection if
          work isn&apos;t delivered, and nobody should lose money to a stranger
          on the internet. We&apos;re building the payment link we wish existed.
        </p>
        <div className="mt-4">
          <Link
            href="/how-it-works"
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand transition-colors duration-200 hover:text-brand-hover"
          >
            See how it works
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.section>
    </div>
  );
}
