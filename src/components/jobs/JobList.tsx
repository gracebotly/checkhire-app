import { JobCard } from "@/components/jobs/JobCard";
import { JobCardSkeleton } from "@/components/jobs/JobCardSkeleton";
import { SearchX } from "lucide-react";
import type { JobListingWithEmployer } from "@/types/database";

interface JobListProps {
  listings: JobListingWithEmployer[];
  total: number;
  loading?: boolean;
}

export function JobList({ listings, total, loading }: JobListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
        <SearchX className="mx-auto h-8 w-8 text-slate-600" />
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          No jobs match your filters
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Try broadening your search, removing some filters, or adjusting the
          salary range.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{total}</span> verified
        job{total !== 1 ? "s" : ""}
      </p>
      <div className="space-y-4">
        {listings.map((listing, index) => (
          <JobCard key={listing.id} listing={listing} index={index} />
        ))}
      </div>
    </div>
  );
}
