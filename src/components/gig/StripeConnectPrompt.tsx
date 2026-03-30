"use client";

import { Landmark } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Props = {
  onConnect: () => void;
  loading: boolean;
};

export function StripeConnectPrompt({ onConnect, loading }: Props) {
  return (
    <Alert variant="warning">
      <div className="flex items-start gap-3">
        <Landmark className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">
            Connect your bank account
          </p>
          <p className="mt-1 text-sm text-slate-600">
            You need to connect your bank account to receive payments. CheckHire
            uses Stripe for secure payouts.
          </p>
          <Button
            onClick={onConnect}
            disabled={loading}
            size="sm"
            className="mt-3"
          >
            {loading ? "Connecting..." : "Connect with Stripe"}
          </Button>
        </div>
      </div>
    </Alert>
  );
}
