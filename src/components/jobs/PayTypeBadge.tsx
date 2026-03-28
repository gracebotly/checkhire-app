import { cn } from "@/lib/utils";
import type { PayType } from "@/types/database";

const PAY_LABELS: Record<PayType, string> = {
  salary: "Salary",
  hourly: "Hourly",
  commission: "Commission",
  project: "Project",
};

interface PayTypeBadgeProps {
  payType: PayType;
  className?: string;
}

export function PayTypeBadge({ payType, className }: PayTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors duration-200",
        className
      )}
    >
      {PAY_LABELS[payType]}
    </span>
  );
}
