"use client";

import { motion } from "framer-motion";
import { Search, Shield, Unlock, Handshake } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    title: "Browse verified jobs",
    description: "Every listing has passed employer verification. Filter by trust tier, salary, and remote type.",
  },
  {
    icon: Shield,
    title: "Apply as \"Silver Oak\"",
    description: "You get a random pseudonym. Employers see your skills — not your name, email, or resume.",
  },
  {
    icon: Unlock,
    title: "Reveal on your terms",
    description: "Your first name shows only when you accept an interview. Full name only after the interview.",
  },
  {
    icon: Handshake,
    title: "Get hired with confidence",
    description: "Real employers. Real salaries. Gig workers get escrow protection — funds secured before work starts.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-white px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-slate-900">
            How CheckHire works
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Four steps to a safer job search.
          </p>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: index * 0.04,
                  ease: "easeOut",
                }}
                className="text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-bold text-slate-900 shadow-sm">
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <div className="mt-1 text-xs font-semibold text-brand">
                  Step {index + 1}
                </div>
                <h3 className="mt-2 text-sm font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
