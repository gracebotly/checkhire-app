"use client";

import { motion } from "framer-motion";
import { ShieldCheck, UserRoundX, DollarSign } from "lucide-react";

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Verified Employers",
    description:
      "Every employer passes real verification — payment, identity, or documentation. Scammers can't get through.",
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
  },
  {
    icon: UserRoundX,
    title: "Protected Identity",
    description:
      "Apply as \"Silver Oak\" — your name, email, and resume are hidden until you decide to reveal them.",
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  {
    icon: DollarSign,
    title: "Transparent Pay",
    description:
      "Salary is always shown. Commission structures are fully disclosed. No more \"Competitive\" or \"DOE.\"",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
];

export function TrustPillars() {
  return (
    <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Built different from every other job board
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Trust isn&apos;t an afterthought here. It&apos;s the entire product.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: index * 0.04,
                  ease: "easeOut",
                }}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <div
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${pillar.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${pillar.iconColor}`} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {pillar.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
