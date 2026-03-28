import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDaysRemaining } from "@/lib/formatting";

interface DaysRemainingProps {
  expiresAt: string;
  className?: string;
}

const URGENCY_STYLES = {
  green: "text-emerald-700",
  yellow: "text-amber-700",
  red: "text-red-700",
  expired: "text-slate-600",
};

export function DaysRemaining({ expiresAt, className }: DaysRemainingProps) {
  const { label, urgency } = getDaysRemaining(expiresAt);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        URGENCY_STYLES[urgency],
        className
      )}
    >
      <Clock className="h-4 w-4" />
      {label}
    </span>
  );
}
