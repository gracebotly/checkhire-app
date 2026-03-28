"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Menu, X } from "lucide-react";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-2 transition-colors duration-200"
        >
          <Shield className="h-5 w-5 text-brand" />
          <span className="font-display text-lg font-bold text-slate-900">
            CheckHire
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/jobs"
            className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
          >
            Browse Jobs
          </Link>
          <Link
            href="/login"
            className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
          >
            For Employers
          </Link>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-slate-900 transition-colors duration-200 hover:bg-gray-50"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
          >
            Post a Job
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="cursor-pointer rounded-lg p-2 text-slate-600 transition-colors duration-200 hover:bg-gray-50 md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="border-t border-gray-200 bg-white px-6 py-4 md:hidden"
          >
            <nav className="flex flex-col gap-3">
              <Link
                href="/jobs"
                onClick={() => setMobileOpen(false)}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50"
              >
                Browse Jobs
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50"
              >
                For Employers
              </Link>
              <div className="my-1 h-px bg-gray-100" />
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="cursor-pointer rounded-lg bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
              >
                Post a Job
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
