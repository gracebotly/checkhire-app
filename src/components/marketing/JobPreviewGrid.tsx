import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JobCard } from "@/components/jobs/JobCard";
import type { JobListingWithEmployer } from "@/types/database";

interface JobPreviewGridProps {
  listings: JobListingWithEmployer[];
}

export function JobPreviewGrid({ listings }: JobPreviewGridProps) {
  if (!listings || listings.length === 0) return null;

  return (
    <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Latest verified listings
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Real jobs from verified employers. Updated daily.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing, index) => (
            <JobCard key={listing.id} listing={listing} index={index} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/jobs"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors duration-200 hover:bg-gray-50"
          >
            Browse all jobs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
