"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Calendar, Lock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrustBadge } from "@/components/gig/TrustBadge";
import { categoryLabels } from "@/lib/categories";
import type { TrustBadge as TrustBadgeType } from "@/types/database";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type Props = {
  deal: {
    id: string;
    title: string;
    description: string;
    total_amount: number;
    deadline: string | null;
    deal_link_slug: string;
    category: string | null;
    escrow_status: string;
    client: {
      display_name: string | null;
      avatar_url: string | null;
      trust_badge: string;
      completed_deals_count: number;
    };
    interested_count: number;
  };
  index: number;
};

export function PublicGigCard({ deal, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
    >
      <Link
        href={`/deal/${deal.deal_link_slug}`}
        className="block cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50/50"
      >
        {/* Badges row: category + escrow */}
        <div className="flex flex-wrap items-center gap-1.5">
          {deal.escrow_status === "funded" && (
            <Badge variant="success" className="text-xs">
              <Lock className="mr-1 h-3 w-3" />
              Payment Secured
            </Badge>
          )}
          {deal.category && (
            <Badge variant="outline" className="text-xs">
              {categoryLabels[deal.category] || deal.category}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-2 text-base font-semibold text-slate-900 line-clamp-2">
          {deal.title}
        </h3>

        {/* Description */}
        <p className="mt-1 text-sm text-slate-600 line-clamp-2">
          {deal.description}
        </p>

        {/* Amount */}
        <p className="mt-3 font-mono text-lg font-semibold tabular-nums text-slate-900">
          ${(deal.total_amount / 100).toFixed(2)}
        </p>

        {/* Deadline */}
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-600">
          <Calendar className="h-3.5 w-3.5" />
          {deal.deadline
            ? new Date(deal.deadline).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "Flexible timeline"}
        </div>

        <Separator className="my-3" />

        {/* Bottom: client info + interest count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {deal.client.avatar_url ? (
              <img
                src={deal.client.avatar_url}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-muted text-[10px] font-semibold text-brand">
                {getInitials(deal.client.display_name)}
              </div>
            )}
            <span className="text-xs font-medium text-slate-900">
              {deal.client.display_name || "Client"}
            </span>
            <TrustBadge
              badge={deal.client.trust_badge as TrustBadgeType}
              size="sm"
            />
          </div>

          {deal.interested_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Users className="h-3.5 w-3.5" />
              {deal.interested_count} {deal.interested_count === 1 ? "applicant" : "applicants"}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
