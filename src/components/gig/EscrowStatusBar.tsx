import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import type { EscrowStatus } from "@/types/database";

type Props = {
  status: EscrowStatus;
  amount: number; // cents
};

const config: Record<
  EscrowStatus,
  {
    bg: string;
    icon: React.ElementType;
    iconClass: string;
    getText: (amt: string) => string;
  }
> = {
  unfunded: {
    bg: "bg-gray-50 border-gray-200",
    icon: Shield,
    iconClass: "text-slate-600",
    getText: () => "Awaiting Payment",
  },
  funded: {
    bg: "bg-green-50 border-green-200",
    icon: ShieldCheck,
    iconClass: "text-green-700",
    getText: (amt) => `Payment Secured — $${amt}`,
  },
  partially_released: {
    bg: "bg-green-50 border-green-200",
    icon: ShieldCheck,
    iconClass: "text-green-700",
    getText: (amt) => `Partially Released — $${amt} total`,
  },
  fully_released: {
    bg: "bg-brand-muted border-brand",
    icon: CheckCircle,
    iconClass: "text-brand",
    getText: (amt) => `Payment Released — $${amt}`,
  },
  frozen: {
    bg: "bg-amber-50 border-amber-200",
    icon: AlertTriangle,
    iconClass: "text-amber-700",
    getText: () => "Funds Frozen — Dispute in progress",
  },
  refunded: {
    bg: "bg-red-50 border-red-200",
    icon: RotateCcw,
    iconClass: "text-red-700",
    getText: () => "Refunded",
  },
};

export function EscrowStatusBar({ status, amount }: Props) {
  const c = config[status];
  const Icon = c.icon;
  const formattedAmount = (amount / 100).toFixed(2);

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-4 ${c.bg}`}
    >
      <Icon className={`h-5 w-5 ${c.iconClass}`} />
      <span className="text-sm font-semibold text-slate-900">
        {c.getText(formattedAmount)}
      </span>
    </div>
  );
}
