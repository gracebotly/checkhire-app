"use client";

import { useState } from "react";
import { motion } from "motion/react";

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
  const [amount, setAmount] = useState<string>("300");
  const [tab, setTab] = useState<"client" | "freelancer">("client");

  const gigAmount = parseFloat(amount) || 0;

  // Client-side calculations
  const checkHireFee = gigAmount * 0.05;
  const subtotal = gigAmount + checkHireFee;
  // Stripe fee on the total charge (reverse-calculated so Stripe gets exactly 2.9% + $0.30)
  const totalWithStripe = gigAmount > 0 ? (subtotal + 0.30) / (1 - 0.029) : 0;
  const stripeFee = gigAmount > 0 ? totalWithStripe - subtotal : 0;
  const totalClientPays = totalWithStripe;

  // Freelancer-side calculations
  const instantFeeRate = gigAmount * 0.01;
  const instantFee = Math.max(instantFeeRate, 0.50);
  const instantReceives = gigAmount > 0 ? gigAmount - instantFee : 0;

  const handleChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border border-gray-200 bg-white p-6"
    >
      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-full bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab("client")}
          className={`flex-1 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
            tab === "client"
              ? "bg-brand text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          I&apos;m hiring
        </button>
        <button
          type="button"
          onClick={() => setTab("freelancer")}
          className={`flex-1 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
            tab === "freelancer"
              ? "bg-brand text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          I&apos;m freelancing
        </button>
      </div>

      {/* Input */}
      <label className="block text-sm font-semibold text-slate-900">
        {tab === "client"
          ? "How much is the freelancer getting paid?"
          : "How much is the gig paying?"}
      </label>
      <div className="relative mt-3">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-3xl font-bold text-slate-600">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
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
            onClick={() => setAmount(qa)}
            className="cursor-pointer rounded-full border border-gray-200 px-3 py-1 text-xs transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50"
          >
            {quickLabels[qa]}
          </button>
        ))}
      </div>

      {/* Breakdown */}
      <div className="mt-6 space-y-2">
        {tab === "client" ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">
                Freelancer receives
              </span>
              <span className="font-mono text-lg font-semibold tabular-nums text-green-600">
                {fmt(gigAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">
                CheckHire fee (5%)
              </span>
              <span className="font-mono text-sm tabular-nums text-slate-600">
                {fmt(checkHireFee)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">
                Stripe processing (2.9% + $0.30)
              </span>
              <span className="font-mono text-sm tabular-nums text-slate-600">
                {fmt(stripeFee)}
              </span>
            </div>
            <div className="my-2 border-t border-gray-100" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">
                Total charged to your card
              </span>
              <span className="font-mono text-xl font-bold tabular-nums text-slate-900">
                {fmt(totalClientPays)}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-600">
              Stripe processes all payments securely. The 2.9% + $0.30 is
              Stripe&apos;s standard card processing fee — not a CheckHire
              markup. We only keep the 5%.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Gig amount</span>
              <span className="font-mono text-sm tabular-nums text-slate-900">
                {fmt(gigAmount)}
              </span>
            </div>
            <div className="my-2 border-t border-gray-100" />

            {/* Standard payout */}
            <div className="rounded-lg bg-green-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Standard payout
                  </p>
                  <p className="text-xs text-slate-600">
                    2 business days to your bank
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-lg font-semibold tabular-nums text-green-600">
                    {fmt(gigAmount)}
                  </span>
                  <p className="text-xs font-semibold text-green-600">FREE</p>
                </div>
              </div>
            </div>

            {/* Instant payout */}
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Instant payout
                  </p>
                  <p className="text-xs text-slate-600">
                    Under 30 min to your debit card
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-lg font-semibold tabular-nums text-green-600">
                    {gigAmount > 0 ? fmt(instantReceives) : "$0.00"}
                  </span>
                  <p className="text-xs text-slate-600">
                    1% fee ({fmt(gigAmount > 0 ? instantFee : 0)})
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600">
              You keep 100% with standard payouts — zero fees, ever. Instant
              payout is optional for when you want your money now. Available
              24/7 including weekends.
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}
