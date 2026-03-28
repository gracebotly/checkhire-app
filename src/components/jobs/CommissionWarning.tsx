import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommissionWarningProps {
  className?: string;
}

export function CommissionWarning({ className }: CommissionWarningProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800",
        className
      )}
    >
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      Commission only — no base salary
    </div>
  );
}
