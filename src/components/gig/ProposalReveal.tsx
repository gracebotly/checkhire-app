"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  totalAmountCents: number;
  claimantPercentage: number | null;
  respondentPercentage: number | null;
  claimantName: string;
  respondentName: string;
  isResolved: boolean;
  negotiationRound: number;
  onAdjustProposal?: () => void;
};

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function ProposalCard({
  name,
  percentage,
  totalAmountCents,
  waiting,
}: {
  name: string;
  percentage: number | null;
  totalAmountCents: number;
  waiting: boolean;
}) {
  if (waiting) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900 mb-2">{name}</p>
        <div className="flex items-center justify-center h-16">
          <p className="text-sm text-slate-600">Waiting for response...</p>
        </div>
      </div>
    );
  }

  const freelancerAmount = Math.round(
    (totalAmountCents * (percentage ?? 0)) / 100
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900 mb-2">{name}</p>
      <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
        {percentage}%
      </p>
      <p className="text-sm text-slate-600 font-mono tabular-nums">
        {formatAmount(freelancerAmount)} to freelancer
      </p>
    </div>
  );
}

export function ProposalReveal({
  totalAmountCents,
  claimantPercentage,
  respondentPercentage,
  claimantName,
  respondentName,
  isResolved,
  negotiationRound,
  onAdjustProposal,
}: Props) {
  const bothExist =
    claimantPercentage !== null && respondentPercentage !== null;

  // Determine overlap (client offer >= freelancer ask)
  const hasOverlap =
    bothExist &&
    (claimantPercentage === respondentPercentage ||
      Math.max(claimantPercentage!, respondentPercentage!) <=
        Math.min(claimantPercentage!, respondentPercentage!) ||
      isResolved);

  return (
    <div className="space-y-3">
      {/* Status banner */}
      {isResolved && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2"
        >
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-base font-semibold text-green-800">
            Agreement reached!
          </p>
        </motion.div>
      )}

      {bothExist && !isResolved && negotiationRound < 2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-base font-semibold text-amber-800">
            One more round to negotiate
          </p>
          {onAdjustProposal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAdjustProposal}
              className="mt-2"
            >
              Adjust Proposal
            </Button>
          )}
        </div>
      )}

      {negotiationRound >= 2 && !isResolved && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-base font-semibold text-slate-700">
            Under human review
          </p>
        </div>
      )}

      {/* Proposal cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProposalCard
          name={claimantName}
          percentage={claimantPercentage}
          totalAmountCents={totalAmountCents}
          waiting={claimantPercentage === null}
        />
        <ProposalCard
          name={respondentName}
          percentage={respondentPercentage}
          totalAmountCents={totalAmountCents}
          waiting={respondentPercentage === null}
        />
      </div>
    </div>
  );
}
