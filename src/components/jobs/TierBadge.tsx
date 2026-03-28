"use client";

import { Shield, CreditCard, Building2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TierLevel } from "@/types/database";

const TIER_CONFIG: Record<
  TierLevel,
  {
    label: string;
    icon: typeof Shield;
    tooltip: string;
    badgeClass: string;
    iconClass: string;
  }
> = {
  1: {
    label: "Payment Verified",
    icon: CreditCard,
    tooltip:
      "This employer routes payment through CheckHire. Verified bank account and full KYC.",
    badgeClass: "bg-amber-50 text-amber-800 border border-amber-200",
    iconClass: "text-amber-600",
  },
  2: {
    label: "Identity Verified",
    icon: Shield,
    tooltip:
      "This employer verified their identity with video introduction and government ID.",
    badgeClass: "bg-blue-50 text-blue-800 border border-blue-200",
    iconClass: "text-blue-600",
  },
  3: {
    label: "Business Verified",
    icon: Building2,
    tooltip:
      "This employer passed documentation checks, domain verification, and LinkedIn cross-check.",
    badgeClass: "bg-slate-50 text-slate-700 border border-slate-200",
    iconClass: "text-slate-500",
  },
};

interface TierBadgeProps {
  tier: TierLevel;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function TierBadge({
  tier,
  size = "sm",
  showLabel = true,
  className,
}: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors duration-200",
        size === "sm" && "px-2.5 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        config.badgeClass,
        className
      )}
    >
      <Icon className={cn("h-4 w-4", config.iconClass)} />
      {showLabel && config.label}
    </span>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top">
          <div className="max-w-xs border border-gray-200 bg-white text-sm text-slate-900 shadow-lg">
            <p>{config.tooltip}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
