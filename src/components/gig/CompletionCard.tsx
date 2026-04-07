"use client";

import { motion } from "motion/react";
import { CheckCircle2, Zap } from "lucide-react";
import { InstantPayoutCard } from "@/components/gig/InstantPayoutCard";

type Props = {
  dealId: string;
  amountCents: number;
  isGuestFreelancer: boolean;
};

export function CompletionCard({ dealId, amountCents, isGuestFreelancer }: Props) {
  const amount = `$${(amountCents / 100).toFixed(2)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-4"
    >
      <div className="rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-green-100 p-2">
            <CheckCircle2 className="h-5 w-5 text-green-700" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">
              Payment released
            </h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              The client confirmed delivery.{" "}
              <span className="font-mono font-semibold tabular-nums text-slate-900">
                {amount}
              </span>{" "}
              is on its way to your account. Standard payouts arrive within 2 business days, or use instant payout below for seconds.
            </p>
          </div>
        </div>
      </div>

      <InstantPayoutCard amount={amountCents} dealId={dealId} />

      {isGuestFreelancer && (
        <div className="rounded-xl border border-brand/20 bg-brand-muted p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white p-2">
              <Zap className="h-4 w-4 text-brand" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">
                Save your next deal
              </p>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Create a free account with the email you already used. Your payment history and Stripe connection carry over automatically. Next time a brand hires you, it&apos;s one click.
              </p>
              <a
                href="/login?mode=signup"
                className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand transition-colors duration-200 hover:text-brand-hover"
              >
                Create a free account →
              </a>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
