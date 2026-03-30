"use client";

import { StarRating } from "./StarRating";
import type { RatingWithUser } from "@/types/database";

type Props = {
  rating: RatingWithUser;
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RatingDisplay({ rating }: Props) {
  return (
    <div className="flex gap-3 py-3">
      {/* Avatar */}
      {rating.rater.avatar_url ? (
        <img
          src={rating.rater.avatar_url}
          alt=""
          className="h-8 w-8 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-muted text-xs font-semibold text-brand flex-shrink-0">
          {getInitials(rating.rater.display_name)}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {rating.rater.profile_slug ? (
            <a
              href={`/u/${rating.rater.profile_slug}`}
              className="cursor-pointer text-sm font-semibold text-slate-900 transition-colors duration-200 hover:text-brand"
            >
              {rating.rater.display_name || "Anonymous"}
            </a>
          ) : (
            <span className="text-sm font-semibold text-slate-900">
              {rating.rater.display_name || "Anonymous"}
            </span>
          )}
          <StarRating rating={rating.stars} size="sm" />
        </div>
        {rating.comment && (
          <p className="mt-1 text-sm text-slate-600">{rating.comment}</p>
        )}
        <p className="mt-1 text-xs text-slate-600">{timeAgo(rating.created_at)}</p>
      </div>
    </div>
  );
}
