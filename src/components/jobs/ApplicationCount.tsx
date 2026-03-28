import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatApplicationCount } from "@/lib/formatting";

interface ApplicationCountProps {
  current: number;
  max: number;
  className?: string;
}

const URGENCY_BAR_COLORS = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

export function ApplicationCount({
  current,
  max,
  className,
}: ApplicationCountProps) {
  const { label, percentage, urgency } = formatApplicationCount(current, max);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Users className="h-4 w-4 text-slate-600" />
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-200",
              URGENCY_BAR_COLORS[urgency]
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
    </div>
  );
}
