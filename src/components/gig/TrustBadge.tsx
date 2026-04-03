import { CheckCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import type { TrustBadge as TrustBadgeType } from "@/types/database";

type Props = {
  badge: TrustBadgeType;
  size?: "sm" | "md";
};

export function TrustBadge({ badge, size = "sm" }: Props) {
  if (badge === "new") {
    return null;
  }

  const iconClass = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  const config = {
    trusted: {
      icon: <CheckCircle className={iconClass} />,
      label: "Trusted",
      className: "bg-brand-muted text-brand",
    },
    established: {
      icon: <CheckCircle2 className={iconClass} />,
      label: "Established",
      className: "bg-teal-50 text-teal-800",
    },
    verified: {
      icon: <ShieldCheck className={iconClass} />,
      label: "Verified",
      className: "bg-blue-50 text-blue-800",
    },
  } as const;

  const { icon, label, className } = config[badge];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}
