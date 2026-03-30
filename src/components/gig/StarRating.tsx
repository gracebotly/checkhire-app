"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  rating: number; // 1-5, can be decimal (e.g., 4.3)
  size?: "sm" | "md";
};

export function StarRating({ rating, size = "md" }: Props) {
  const sizeClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const roundedRating = Math.round(rating); // round to nearest whole star

  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            sizeClass,
            i <= roundedRating
              ? "text-amber-500 fill-amber-500"
              : "text-gray-200"
          )}
        />
      ))}
    </span>
  );
}
