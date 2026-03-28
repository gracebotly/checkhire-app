import { PageHeader } from "@/components/layout/page-header";
import { Briefcase, Plus } from "lucide-react";
import Link from "next/link";

export default function EmployerListingsPage() {
  return (
    <div className="min-h-screen">
      <PageHeader
        title="My Listings"
        subtitle="Manage your job postings."
      />

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Action bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">0 listings</p>
          <Link
            href="/employer/listings/new"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
          >
            <Plus className="h-4 w-4" />
            New Listing
          </Link>
        </div>

        {/* Empty state */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-muted">
            <Briefcase className="h-7 w-7 text-brand" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            No listings yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Post your first job listing to start receiving verified,
            pseudonymous applications from qualified candidates.
          </p>
          <Link
            href="/employer/listings/new"
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
          >
            <Plus className="h-4 w-4" />
            Create Your First Listing
          </Link>
        </div>
      </div>
    </div>
  );
}
