"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const quickAmounts = ["50", "100", "200", "500", "1000"];
const quickLabels: Record<string, string> = {
  "50": "$50",
  "100": "$100",
  "200": "$200",
  "500": "$500",
  "1000": "$1,000",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);

export function FeeCalculator() {
  const [freelancerAmount, setFreelancerAmount] = useState<string>("300");

  const amount = parseFloat(freelancerAmount) || 0;
  const platformFee = amount * 0.05;
  const clientPays = amount + platformFee;

  const handleChange = (value: string) => {
    // Strip non-numeric except dot, limit to 2 decimal places
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setFreelancerAmount(cleaned);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border border-gray-200 bg-white p-6"
    >
      <label className="block text-sm font-semibold text-slate-900">
        How much is the freelancer getting paid?
      </label>

      <div className="relative mt-3">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-3xl font-bold text-slate-600">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={freelancerAmount}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-4 pl-10 pr-4 text-center font-mono text-3xl font-bold tabular-nums text-slate-900 transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {/* Quick amount pills */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {quickAmounts.map((qa) => (
          <button
            key={qa}
            type="button"
            onClick={() => setFreelancerAmount(qa)}
            className="cursor-pointer rounded-full border border-gray-200 px-3 py-1 text-xs transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50"
          >
            {quickLabels[qa]}
          </button>
        ))}
      </div>

      {/* Breakdown */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Freelancer receives</span>
          <span className="font-mono text-lg font-semibold tabular-nums text-green-600">
            {fmt(amount)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">CheckHire fee (5%)</span>
          <span className="font-mono text-sm tabular-nums text-slate-600">
            {fmt(platformFee)}
          </span>
        </div>
        <div className="border-t border-gray-100 my-2" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">You pay</span>
          <span className="font-mono text-xl font-bold tabular-nums text-slate-900">
            {fmt(clientPays)}
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs italic text-slate-600">
        The freelancer always receives exactly what you offer. All fees are on
        you — that&apos;s how we keep freelancers advocating for safe payments.
      </p>
    </motion.div>
  );
}
