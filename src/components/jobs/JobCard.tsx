"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { TierBadge } from "@/components/jobs/TierBadge";
import { CompensationDisplay } from "@/components/jobs/CompensationDisplay";
import { CommissionWarning } from "@/components/jobs/CommissionWarning";
import { DaysRemaining } from "@/components/jobs/DaysRemaining";
import { ApplicationCount } from "@/components/jobs/ApplicationCount";
import { RemoteTag } from "@/components/jobs/RemoteTag";
import { PayTypeBadge } from "@/components/jobs/PayTypeBadge";
import { formatPostedDate } from "@/lib/formatting";
import type { JobListingWithEmployer, TierLevel } from "@/types/database";

interface JobCardProps {
  listing: JobListingWithEmployer;
  index?: number;
}

export function JobCard({ listing, index = 0 }: JobCardProps) {
  const employer = listing.employers;
  const companyInitial = employer.company_name?.charAt(0)?.toUpperCase() || "C";

  const location =
    listing.remote_type === "full_remote"
      ? "Anywhere"
      : [listing.location_city, listing.location_state]
          .filter(Boolean)
          .join(", ") || listing.location_country;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: "easeOut" }}
    >
      <Link
        href={`/jobs/${listing.slug}`}
        className="group block cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50/50"
      >
        {/* Top row: company info + tier badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {employer.logo_url ? (
              <Image
                src={employer.logo_url}
                alt={employer.company_name}
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                {companyInitial}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-600">
                {employer.company_name}
              </p>
              <h3 className="text-base font-semibold text-slate-900">
                {listing.title}
              </h3>
            </div>
          </div>
          <TierBadge tier={employer.tier_level as TierLevel} size="sm" />
        </div>

        {/* Compensation */}
        <div className="mt-3">
          {listing.is_100_percent_commission ? (
            <CommissionWarning />
          ) : (
            <CompensationDisplay
              salaryMin={listing.salary_min}
              salaryMax={listing.salary_max}
              payType={listing.pay_type}
              commissionStructure={listing.commission_structure}
              oteMin={listing.ote_min}
              oteMax={listing.ote_max}
              is100PercentCommission={listing.is_100_percent_commission}
              size="sm"
            />
          )}
        </div>

        {/* Tags row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <RemoteTag remoteType={listing.remote_type} />
          <PayTypeBadge payType={listing.pay_type} />
          {listing.remote_type !== "full_remote" && location && (
            <span className="text-xs text-slate-600">{location}</span>
          )}
        </div>

        {/* Footer: metadata */}
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex items-center gap-4">
            <DaysRemaining expiresAt={listing.expires_at} />
            <span className="text-xs text-slate-600">
              {formatPostedDate(listing.created_at)}
            </span>
            {employer.transparency_score > 0 && (
              <span className="flex items-center gap-1 text-xs text-slate-600">
                <BarChart3 className="h-3 w-3" />
                <span className="font-semibold tabular-nums text-slate-900">
                  {employer.transparency_score}
                </span>
                /5
              </span>
            )}
          </div>
          <ApplicationCount
            current={listing.current_application_count}
            max={listing.max_applications}
          />
        </div>
      </Link>
    </motion.div>
  );
}
