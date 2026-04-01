"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, DollarSign, TrendingUp, Check, X, MousePointerClick } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";

interface AdminReferralData {
  overview: {
    total_referrers: number;
    total_referred_users: number;
    total_commissions_earned: number;
    total_commissions_paid: number;
    pending_payouts: number;
    total_clicks: number;
    conversion_rate: number;
  };
  top_referrers: Array<{
    user_id: string;
    display_name: string;
    referral_code: string;
    total_referrals: number;
    total_earnings: number;
  }>;
  pending_payouts: Array<{
    id: string;
    user_id: string;
    display_name: string;
    amount: number;
    method: string;
    created_at: string;
  }>;
  recent_earnings: Array<{
    id: string;
    referrer_user_id: string;
    deal_amount: number;
    referral_commission: number;
    created_at: string;
  }>;
}

export function AdminReferralsTab() {
  const [data, setData] = useState<AdminReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/admin/referrals");
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Failed to fetch admin referral data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayout(payoutId: string, status: "completed" | "failed") {
    setProcessing(payoutId);
    try {
      const res = await fetch(`/api/admin/referrals/payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchData();
        setRejectId(null);
      }
    } catch (err) {
      console.error("Failed to process payout:", err);
    } finally {
      setProcessing(null);
    }
  }

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-sm text-slate-600">Failed to load referral data.</p>;

  const stats = [
    { label: "Referrers", value: data.overview.total_referrers, icon: Users },
    { label: "Referred Users", value: data.overview.total_referred_users, icon: Users },
    {
      label: "Total Earned",
      value: formatCents(data.overview.total_commissions_earned),
      icon: DollarSign,
    },
    { label: "Clicks", value: data.overview.total_clicks, icon: MousePointerClick },
    { label: "Convert Rate", value: `${data.overview.conversion_rate}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
            className="bg-white rounded-xl border border-gray-200 p-5 text-center"
          >
            <stat.icon className="h-4 w-4 text-slate-600 mx-auto mb-2" />
            <div className="text-xl font-semibold text-slate-900 font-mono tabular-nums">{stat.value}</div>
            <div className="text-xs text-slate-600 mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {data.pending_payouts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <h3 className="font-display text-base font-semibold text-slate-900 mb-3">
            Pending Payouts ({data.pending_payouts.length})
          </h3>
          <div className="space-y-0">
            {data.pending_payouts.map((payout, index) => (
              <motion.div
                key={payout.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-900">{payout.display_name}</span>
                  <span className="text-sm font-mono tabular-nums text-slate-900">{formatCents(payout.amount)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handlePayout(payout.id, "completed")}
                    disabled={processing === payout.id}
                    className="cursor-pointer transition-colors duration-200"
                  >
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRejectId(payout.id)}
                    disabled={processing === payout.id}
                    className="cursor-pointer transition-colors duration-200"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-display text-base font-semibold text-slate-900 mb-3">Top Referrers</h3>
        {data.top_referrers.length === 0 ? (
          <p className="text-sm text-slate-600">No referrers yet.</p>
        ) : (
          <div className="space-y-0">
            {data.top_referrers.map((referrer, index) => (
              <motion.div
                key={referrer.user_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
                className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-600 w-6">#{index + 1}</span>
                  <span className="text-sm font-semibold text-slate-900">{referrer.display_name}</span>
                </div>
                <span className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                  {formatCents(referrer.total_earnings)}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog.Root open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl border border-gray-200 p-6 w-full max-w-sm z-50 shadow-lg">
            <Dialog.Title className="font-display text-lg font-semibold text-slate-900 mb-2">Reject payout?</Dialog.Title>
            <Dialog.Description className="text-sm text-slate-600 mb-4">
              This will mark the payout request as failed.
            </Dialog.Description>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRejectId(null)}
                className="cursor-pointer transition-colors duration-200"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => rejectId && handlePayout(rejectId, "failed")}
                disabled={!!processing}
                className="cursor-pointer transition-colors duration-200"
              >
                Reject
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
