"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  Link2,
  Shield,
  Scale,
  Clock,
  DollarSign,
  Users,
  Camera,
  Briefcase,
  Building2,
  ArrowRight,
} from "lucide-react";

const differentiators = [
  {
    title: "A payment link, not a marketplace",
    description:
      "CheckHire is not a job board or a marketplace. You find each other wherever you already are — Reddit, Instagram DMs, Discord, Facebook, WhatsApp, email. We give you a payment link that locks funds in escrow before work starts. Share it anywhere a URL works.",
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
      "When the work is submitted, the paying party has 72 hours to confirm delivery or open a dispute. If they do nothing, funds auto-release automatically. No more chasing payments or waiting on someone who ghosted.",
    icon: Clock,
  },
] as const;

const stats = [
  {
    value: "$0",
    label: "creator & freelancer fees — the paying party covers everything",
  },
  {
    value: "72hrs",
    label: "auto-release protects you from clients and brands that ghost",
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
          We built CheckHire because doing the work shouldn&apos;t mean
          gambling on getting paid.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Every day, creators shoot brand content that never gets paid for.
          Freelancers build websites for clients who disappear. Gig workers
          deliver results and then spend weeks chasing invoices. The work
          happens on DMs and handshake agreements — and when it goes wrong,
          there&apos;s no recourse. CheckHire exists to fix that. We built an
          escrow payment link that works everywhere you find work — whether
          that&apos;s Reddit, Instagram, Discord, Facebook, or a cold email.
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
              <strong className="text-slate-900">Create a payment link</strong>{" "}
              — describe the work, set the budget, and define what &ldquo;done&rdquo;
              looks like. Takes under 2 minutes.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted font-mono text-xs font-semibold text-brand">
              2
            </span>
            <span>
              <strong className="text-slate-900">Payment gets locked</strong>{" "}
              — the paying party funds escrow via Stripe. Card, Apple Pay, Google
              Pay, PayPal, or bank transfer. 5% fee from the paying party. You
              pay nothing.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted font-mono text-xs font-semibold text-brand">
              3
            </span>
            <span>
              <strong className="text-slate-900">Share the link</strong>{" "}
              — send it over DM, email, or text. The other person clicks, accepts
              with just an email. No account needed.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted font-mono text-xs font-semibold text-brand">
              4
            </span>
            <span>
              <strong className="text-slate-900">Do the work</strong>{" "}
              — upload evidence as you go. Screenshots, files, links — everything
              timestamped. This is your proof of delivery.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted font-mono text-xs font-semibold text-brand">
              5
            </span>
            <span>
              <strong className="text-slate-900">Get paid</strong>{" "}
              — payment releases when delivery is confirmed. If the other party
              ghosts, funds auto-release after 72 hours. Instant payout to your
              debit card available 24/7.
            </span>
          </li>
        </ol>
      </motion.section>

      {/* Who It's For */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.16 }}
        className="mt-12"
      >
        <h2 className="font-display text-2xl font-semibold text-slate-900">
          Who It&apos;s For
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.16 }}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted">
              <Camera className="h-5 w-5 text-brand" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Creators</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Lock payment before you shoot a single frame of brand content. No
              more creating for free.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.2 }}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted">
              <Users className="h-5 w-5 text-brand" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Freelancers
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Send your client a payment link instead of an invoice and a prayer.
              See funds locked before you start.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.24 }}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted">
              <Briefcase className="h-5 w-5 text-brand" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Gig Workers
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Protect yourself when the person hiring you is a stranger on the
              internet. Payment secured before work starts.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.28 }}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted">
              <Building2 className="h-5 w-5 text-brand" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Brands &amp; Clients
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Your money is protected too. Funds only release when you confirm
              delivery. Dispute resolution if anything goes wrong.
            </p>
          </motion.div>
        </div>
        <p className="mt-4 rounded-xl border border-gray-200 bg-white p-5 text-xs text-slate-600 leading-relaxed">
          We also run{" "}
          <a
            href="https://reddit.com/r/checkhire"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer font-semibold text-brand transition-colors duration-200 hover:text-brand-hover"
          >
            r/checkhire
          </a>{" "}
          the first hiring community where every job poster is verified. Every
          post must be backed by locked escrow or a video of the poster. We also
          investigate suspicious job postings for free. Submit any link and our
          team will tell you if it&apos;s safe.
        </p>
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
          as sharing a link. We believe every creator deserves to see locked
          funds before producing content, every freelancer deserves payment
          protection before starting work, and every client deserves a refund
          if work isn&apos;t delivered. Nobody should lose money to a stranger
          on the internet. We&apos;re building the payment infrastructure we
          wish existed when we needed it.
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
