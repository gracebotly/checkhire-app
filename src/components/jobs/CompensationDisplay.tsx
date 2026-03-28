import { cn } from "@/lib/utils";
import { formatCompensation } from "@/lib/formatting";
import type { PayType, CommissionStructure } from "@/types/database";

interface CompensationDisplayProps {
  salaryMin: number | null;
  salaryMax: number | null;
  payType: PayType;
  commissionStructure: CommissionStructure | null;
  oteMin: number | null;
  oteMax: number | null;
  is100PercentCommission: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CompensationDisplay({
  salaryMin,
  salaryMax,
  payType,
  commissionStructure,
  oteMin,
  oteMax,
  is100PercentCommission,
  size = "md",
  className,
}: CompensationDisplayProps) {
  const comp = formatCompensation({
    salary_min: salaryMin,
    salary_max: salaryMax,
    pay_type: payType,
    commission_structure: commissionStructure,
    ote_min: oteMin,
    ote_max: oteMax,
    is_100_percent_commission: is100PercentCommission,
  });

  return (
    <div className={cn("tabular-nums", className)}>
      <p
        className={cn(
          "font-semibold text-slate-900",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-lg"
        )}
      >
        {comp.primary}
      </p>
      {comp.secondary && (
        <p className="mt-0.5 text-xs text-slate-600">{comp.secondary}</p>
      )}
    </div>
  );
}
