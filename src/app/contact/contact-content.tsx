"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Flag, Handshake, Mail } from "lucide-react";

const contactOptions = [
  {
    title: "General Inquiries",
    details: "hello@checkhire.com",
    href: "mailto:hello@checkhire.com",
    icon: Mail,
  },
  {
    title: "Report a Listing",
    details: "Use the report button on any listing, or email trust@checkhire.com",
    href: "mailto:trust@checkhire.com",
    icon: Flag,
  },
  {
    title: "Press & Partnerships",
    details: "partnerships@checkhire.com",
    href: "mailto:partnerships@checkhire.com",
    icon: Handshake,
  },
] as const;

export function ContactContent() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 font-sans">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="text-center"
      >
        <h1 className="font-display text-3xl font-bold text-slate-900 md:text-4xl">
          Get in touch
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
          Have a question, found a bug, or want to report a suspicious listing?
          We&apos;d love to hear from you.
        </p>
      </motion.section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {contactOptions.map((option, index) => {
          const Icon = option.icon;

          return (
            <motion.article
              key={option.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="rounded-lg bg-brand-muted p-2 w-fit">
                <Icon className="h-5 w-5 text-brand" />
              </div>
              <h2 className="mt-3 font-display text-lg font-semibold text-slate-900">
                {option.title}
              </h2>
              <Link
                href={option.href}
                className="mt-2 block cursor-pointer text-sm leading-relaxed text-slate-600 transition-colors duration-200 hover:text-slate-900"
              >
                {option.details}
              </Link>
            </motion.article>
          );
        })}
      </section>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.12 }}
        className="mt-8 rounded-xl border border-gray-200 bg-white p-5 text-sm leading-relaxed text-slate-600"
      >
        We typically respond within 24 hours. For urgent safety concerns about a
        listing or employer, use the in-app flagging system for the fastest
        response.
      </motion.p>
    </div>
  );
}
