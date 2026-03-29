"use client";

import { motion } from "framer-motion";
import { BarChart3, Eye, ShieldCheck } from "lucide-react";

const differentiators = [
  {
    title: "Verification-first",
    description:
      "Every employer on CheckHire passes real verification before they can see a single candidate. Not a checkbox. Not a terms-of-service agreement. Real proof — payment through the platform, identity verification, or rigorous documentation checks.",
    icon: ShieldCheck,
  },
  {
    title: "Privacy by design",
    description:
      "When you apply on CheckHire, the employer sees 'Silver Oak' — not your name, not your email, not your resume. Your identity is revealed in stages, and only when you choose to move forward. Your real contact information is never exposed.",
    icon: Eye,
  },
  {
    title: "Accountability built in",
    description:
      "Every employer has a public transparency score based on real data — how fast they respond, whether they actually hire, and what workers say after they're hired. Ghost job posters and data harvesters can't hide.",
    icon: BarChart3,
  },
] as const;

const stats = [
  { value: "1 in 3", label: "job postings never result in a hire" },
  { value: "81%", label: "of recruiters admit to posting ghost jobs" },
  { value: "$0", label: "is what most job boards charge scammers to post" },
] as const;

export function AboutContent() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 font-sans">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <h1 className="font-display text-3xl font-bold text-slate-900 md:text-4xl">
          We built CheckHire because the job market is broken.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          One in three job postings is a ghost job. Scammers steal personal data
          through fake listings. Employers harvest resumes with no
          accountability. We decided that was unacceptable.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.04 }}
        className="mt-10"
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
                transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
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

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.08 }}
        className="mt-10"
      >
        <h2 className="font-display text-2xl font-semibold text-slate-900">
          The Problem in Numbers
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.value}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <p className="font-display text-3xl font-bold text-slate-900">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-600">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.12 }}
        className="mt-10 rounded-xl border border-gray-200 bg-white p-6"
      >
        <h2 className="font-display text-2xl font-semibold text-slate-900">Our Mission</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          CheckHire exists to make trust the default in hiring. We believe job
          seekers deserve to know that every listing is real, every salary is
          shown, and their personal data is protected. We&apos;re building the job
          board we wish existed.
        </p>
      </motion.section>
    </div>
  );
}
