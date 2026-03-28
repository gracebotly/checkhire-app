"use client";

import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import Link from "next/link";
import { ApplicationCard } from "./ApplicationCard";

interface ApplicationData {
  id: string;
  pseudonym: string;
  disclosure_level: number;
  status: string;
  created_at: string;
  job_listings: {
    title: string;
    slug: string;
    job_type: string;
    pay_type: string;
    salary_min: number | null;
    salary_max: number | null;
    remote_type: string;
    status: string;
    created_at: string;
    expires_at: string;
    employers: {
      company_name: string;
      tier_level: number;
      logo_url: string | null;
      slug: string | null;
    };
  };
}

interface ApplicationsListProps {
  applications: ApplicationData[];
}

export function ApplicationsList({ applications }: ApplicationsListProps) {
  if (applications.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-muted">
          <Briefcase className="h-4 w-4 text-brand" />
        </div>
        <h2 className="font-display text-lg font-semibold text-slate-900">
          No applications yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Browse verified job listings and apply anonymously with a pseudonym.
          Employers only see your skills and experience — not your name.
        </p>
        <Link
          href="/jobs"
          className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
        >
          Browse Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app, index) => {
        const listing = Array.isArray(app.job_listings)
          ? app.job_listings[0]
          : app.job_listings;
        const employer = listing
          ? Array.isArray(listing.employers)
            ? listing.employers[0]
            : listing.employers
          : null;

        return (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
          >
            <ApplicationCard
              applicationId={app.id}
              pseudonym={app.pseudonym}
              status={app.status}
              createdAt={app.created_at}
              listingTitle={listing?.title ?? "Unknown Listing"}
              listingSlug={listing?.slug ?? ""}
              companyName={employer?.company_name ?? "Unknown"}
              tierLevel={employer?.tier_level ?? 3}
              logoUrl={employer?.logo_url ?? null}
              remoteType={listing?.remote_type ?? "full_remote"}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
