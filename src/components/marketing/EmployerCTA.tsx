"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck, ArrowRight } from "lucide-react";

export function EmployerCTA() {
  return (
    <section className="bg-white px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center md:p-12"
        >
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted">
            <BadgeCheck className="h-5 w-5 text-brand" />
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Hiring? Stand out with verification.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
            Verified employers attract better candidates. Your listings get
            trust badges, transparency scores, and priority placement. No
            more competing with scam postings.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
          >
            Post Your First Job
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
