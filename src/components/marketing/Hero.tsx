"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="bg-white px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
            <ShieldCheck className="h-5 w-5 text-brand" />
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            Every job here is real.
            <br />
            <span className="text-brand">Every employer is verified.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            CheckHire eliminates scams, ghost jobs, and data harvesting. Apply
            anonymously. See real salaries. Trust every listing.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1, ease: "easeOut" }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/jobs"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
          >
            Browse Jobs
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/signup"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-base font-semibold text-slate-900 shadow-sm transition-colors duration-200 hover:bg-gray-50"
          >
            Post a Job
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
