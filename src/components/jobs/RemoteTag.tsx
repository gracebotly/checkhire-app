import { Globe, Building, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RemoteType } from "@/types/database";

const REMOTE_CONFIG: Record<
  RemoteType,
  { label: string; icon: typeof Globe }
> = {
  full_remote: { label: "Remote", icon: Globe },
  hybrid: { label: "Hybrid", icon: Building },
  onsite: { label: "On-site", icon: MapPin },
};

interface RemoteTagProps {
  remoteType: RemoteType;
  className?: string;
}

export function RemoteTag({ remoteType, className }: RemoteTagProps) {
  const config = REMOTE_CONFIG[remoteType];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors duration-200",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      {config.label}
    </span>
  );
}
