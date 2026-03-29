"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="relative mx-auto max-w-lg text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
        >
          <span className="text-[10rem] font-black leading-none tracking-tighter text-gray-100 sm:text-[12rem]">
            404
          </span>
        </motion.div>

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1, ease: "easeOut" }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-muted"
          >
            <Compass className="h-8 w-8 text-brand" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.15, ease: "easeOut" }}
            className="font-display text-2xl font-bold text-slate-900"
          >
            Page not found
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2, ease: "easeOut" }}
            className="mt-3 text-sm text-slate-600"
          >
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Check the URL or head back home.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.25, ease: "easeOut" }}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <Link
              href="/"
              className="cursor-pointer rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
            >
              Go Home
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
