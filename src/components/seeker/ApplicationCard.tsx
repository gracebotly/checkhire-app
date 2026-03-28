"use client";

import { TierBadge } from "@/components/jobs/TierBadge";
import type { TierLevel } from "@/types/database";
import { Building, ChevronRight, Globe, MapPin, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  applied: { label: "Applied", color: "bg-blue-50 text-blue-700 border-blue-200" },
  reviewed: { label: "Reviewed", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  shortlisted: {
    label: "Shortlisted",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  interview_requested: {
    label: "Interview Requested",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  interview_accepted: {
    label: "Interview Accepted",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  offered: {
    label: "Offer Received",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "Not Selected",
    color: "bg-gray-50 text-slate-600 border-gray-200",
  },
  hired: { label: "Hired", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

interface ApplicationCardProps {
  applicationId: string;
  pseudonym: string;
  status: string;
  createdAt: string;
  listingTitle: string;
  listingSlug: string;
  companyName: string;
  tierLevel: number;
  logoUrl: string | null;
  remoteType: string;
}

export function ApplicationCard({
  applicationId,
  pseudonym,
  status,
  createdAt,
  listingTitle,
  listingSlug,
  companyName,
  tierLevel,
  logoUrl,
  remoteType,
}: ApplicationCardProps) {
  void listingSlug;
  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.applied;
  const companyInitial = companyName?.charAt(0)?.toUpperCase() || "C";

  const timeLabel = new Date(createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const RemoteIcon =
    remoteType === "full_remote" ? Globe : remoteType === "hybrid" ? Building : MapPin;

  return (
    <Link
      href={`/seeker/applications/${applicationId}`}
      className="group flex cursor-pointer items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50/50"
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={companyName}
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
          {companyInitial}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-slate-900">{listingTitle}</h3>
          <TierBadge tier={tierLevel as TierLevel} size="sm" />
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-600">{companyName}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-muted px-2 py-0.5 text-xs font-medium text-brand">
            <Shield className="h-3 w-3" />
            {pseudonym}
          </span>
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}
          >
            {statusInfo.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-600">
            <RemoteIcon className="h-3 w-3" />
            {remoteType === "full_remote"
              ? "Remote"
              : remoteType === "hybrid"
                ? "Hybrid"
                : "On-site"}
          </span>
          <span className="text-xs text-slate-600">{timeLabel}</span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition-colors duration-200 group-hover:text-slate-900" />
    </Link>
  );
}
