"use client";

import { cn } from "@/lib/utils";

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export function UnreadBadge({ count, className }: UnreadBadgeProps) {
  if (count <= 0) return null;

  const display = count > 9 ? "9+" : String(count);

  return (
    <span
      className={cn(
        "inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white",
        className
      )}
    >
      {display}
    </span>
  );
}
