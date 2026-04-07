"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Mail, Send, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  dealId: string;
  escrowFunded: boolean;
  initialRecipientEmail: string | null;
  initialRecipientName: string | null;
  invitedAt: string | null;
  onInviteSent: () => void;
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function SendInviteCard({
  dealId,
  escrowFunded,
  initialRecipientEmail,
  initialRecipientName,
  invitedAt,
  onInviteSent,
}: Props) {
  const [email, setEmail] = useState(initialRecipientEmail || "");
  const [name, setName] = useState(initialRecipientName || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);
  const [showResendForm, setShowResendForm] = useState(false);

  const hasBeenSent = !!invitedAt;

  const handleSend = async () => {
    if (!email.trim()) {
      setError("Enter the recipient's email address");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/send-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_email: email.trim(),
          recipient_name: name.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Failed to send invite");
        return;
      }
      setJustSent(true);
      setShowResendForm(false);
      onInviteSent();
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  // ── State 1: Already sent (and not showing resend form) ──
  if (hasBeenSent && !showResendForm && !justSent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-xl border border-gray-200 bg-white p-5"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">
              Invite sent to {initialRecipientName ? `${initialRecipientName} ` : ""}
              <span className="font-mono text-slate-600">{initialRecipientEmail}</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Sent {timeAgo(invitedAt!)} ·{" "}
              {escrowFunded
                ? "Escrow is funded — they'll see it as secured"
                : "Escrow not yet funded — they were told payment is pending"}
            </p>
            <button
              type="button"
              onClick={() => setShowResendForm(true)}
              className="mt-2 cursor-pointer text-xs font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
            >
              Resend invite
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── State 2: Just sent (success flash) ──
  if (justSent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-xl border border-green-200 bg-green-50 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
            <Check className="h-4 w-4 text-green-700" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-900">
              Invite sent to <span className="font-mono">{email}</span>
            </p>
            <p className="mt-0.5 text-xs text-green-800">
              {escrowFunded
                ? "They'll see escrow is locked when they open the link."
                : "They were told payment is pending. You can fund escrow now and they'll see the secured amount when they accept."}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── State 3: Not sent yet (or resending) — show form ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-muted">
          <Mail className="h-4 w-4 text-brand" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {showResendForm ? "Resend the invite" : "Send the invite"}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            {escrowFunded
              ? "Escrow is funded. They'll see the secured amount when they open the link."
              : "Escrow isn't funded yet. The email will tell them payment is pending — you can still send it now and fund escrow later."}
          </p>
        </div>
      </div>

      {!escrowFunded && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-800">
            Heads up — sending now means the recipient will see &quot;Payment Not Yet Secured&quot; until you fund escrow.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-900">
            Recipient name <span className="font-normal text-slate-600">(optional)</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-900">
            Recipient email
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
          />
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button
          onClick={handleSend}
          disabled={loading || !email.trim()}
          className="flex-1"
        >
          {loading ? (
            "Sending..."
          ) : (
            <>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {showResendForm ? "Resend invite" : "Send invite"}
            </>
          )}
        </Button>
        {showResendForm && (
          <button
            type="button"
            onClick={() => {
              setShowResendForm(false);
              setError(null);
            }}
            className="cursor-pointer text-xs font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
          >
            Cancel
          </button>
        )}
      </div>
    </motion.div>
  );
}
