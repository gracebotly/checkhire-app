"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Props = {
  amount: number; // cents
  dealId: string;
};

export function InstantPayoutCard({ amount, dealId }: Props) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<"standard" | "instant">("standard");
  const [loading, setLoading] = useState(false);

  const fee = Math.max(100, Math.round(amount * 0.01));
  const netPayout = amount - fee;

  const handleInstantPayout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/instant-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast("Instant payout requested!", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Instant payout failed",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      <h3 className="text-sm font-semibold text-slate-900">
        Choose your payout speed
      </h3>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {/* Standard */}
        <button
          type="button"
          onClick={() => setSelected("standard")}
          className={`cursor-pointer rounded-lg border p-4 text-left transition-colors duration-200 ${
            selected === "standard"
              ? "border-brand bg-brand-muted"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Free</p>
            {selected === "standard" && (
              <Check className="h-4 w-4 text-brand" />
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-600">2 business days</p>
          <p className="mt-2 text-xs text-slate-600">
            Automatic, no action needed
          </p>
        </button>

        {/* Instant */}
        <button
          type="button"
          onClick={() => setSelected("instant")}
          className={`cursor-pointer rounded-lg border p-4 text-left transition-colors duration-200 ${
            selected === "instant"
              ? "border-brand bg-brand-muted"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              <Zap className="mr-1 inline h-4 w-4" />
              Instant — ${(fee / 100).toFixed(2)} fee
            </p>
            {selected === "instant" && (
              <Check className="h-4 w-4 text-brand" />
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-600">Minutes to your debit card</p>
          <p className="mt-2 font-mono text-xs tabular-nums text-slate-600">
            You receive ${(netPayout / 100).toFixed(2)}
          </p>
        </button>
      </div>

      {selected === "instant" && (
        <Button
          onClick={handleInstantPayout}
          disabled={loading}
          className="mt-3 w-full"
        >
          {loading ? "Processing..." : "Get Paid Instantly"}
        </Button>
      )}

      <p className="mt-3 text-xs text-slate-600">
        Standard payouts are always free and arrive in 2 business days.
      </p>
    </motion.div>
  );
}
