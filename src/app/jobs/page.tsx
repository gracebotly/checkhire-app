import { Suspense } from "react";
import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { JobSearch } from "@/components/jobs/JobSearch";
import { JobFilters } from "@/components/jobs/JobFilters";
import { MobileFilterSheet } from "@/components/jobs/MobileFilterSheet";
import { JobSort } from "@/components/jobs/JobSort";
import { JobList } from "@/components/jobs/JobList";
import { JobPagination } from "@/components/jobs/JobPagination";
import { JobCardSkeleton } from "@/components/jobs/JobCardSkeleton";

export const metadata: Metadata = {
  title: "Browse Verified Remote Jobs",
  description:
    "Find verified remote jobs with real salaries. Every employer on CheckHire is verified. No scams. No ghost jobs.",
};

const LIMIT = 20;

export default async function JobsBrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Browse Jobs
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Every listing is from a verified employer with real compensation shown.
        </p>
      </div>

      {/* Search + Sort bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 sm:max-w-md">
          <Suspense fallback={null}>
            <JobSearch />
          </Suspense>
        </div>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <MobileFilterSheet />
          </Suspense>
          <Suspense fallback={null}>
            <JobSort />
          </Suspense>
        </div>
      </div>

      {/* Main content: filters sidebar + listings */}
      <div className="flex gap-8">
        {/* Desktop filters — hidden on mobile */}
        <div className="hidden lg:block">
          <Suspense fallback={null}>
            <JobFilters />
          </Suspense>
        </div>

        {/* Job listings */}
        <div className="min-w-0 flex-1">
          <Suspense
            fallback={
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <JobCardSkeleton key={i} />
                ))}
              </div>
            }
          >
            <JobResults params={params} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

/**
 * Server component that fetches and renders job results.
 * Separated so it can be wrapped in Suspense.
 */
async function JobResults({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  const supabase = createServiceClient();

  const search = params.search?.trim() || null;
  const jobTypes = params.jobType?.split(",").filter(Boolean) || [];
  const payTypes = params.payType?.split(",").filter(Boolean) || [];
  const remoteTypes = params.remoteType?.split(",").filter(Boolean) || [];
  const tiers = params.tier?.split(",").map(Number).filter(Boolean) || [];
  const salaryMin = params.salaryMin ? parseInt(params.salaryMin) : null;
  const salaryMax = params.salaryMax ? parseInt(params.salaryMax) : null;
  const category = params.category || null;
  const datePosted = params.datePosted ? parseInt(params.datePosted) : null;
  const hideCommissionOnly = params.hideCommissionOnly === "true";
  const sortBy = params.sortBy || "newest";
  const page = Math.max(1, parseInt(params.page || "1"));
  const offset = (page - 1) * LIMIT;

  let query = supabase
    .from("job_listings")
    .select(
      `
      *,
      employers!inner (
        company_name,
        tier_level,
        logo_url,
        transparency_score,
        industry,
        company_size,
        website_domain,
        description,
        country,
        slug
      )
    `,
      { count: "exact" }
    )
    .eq("status", "active");

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`
    );
  }
  if (jobTypes.length > 0) query = query.in("job_type", jobTypes);
  if (payTypes.length > 0) query = query.in("pay_type", payTypes);
  if (remoteTypes.length > 0) query = query.in("remote_type", remoteTypes);
  if (tiers.length > 0) query = query.in("employers.tier_level", tiers);
  if (salaryMin !== null) query = query.gte("salary_max", salaryMin);
  if (salaryMax !== null) query = query.lte("salary_min", salaryMax);
  if (category) query = query.eq("category", category);
  if (datePosted) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - datePosted);
    query = query.gte("created_at", cutoff.toISOString());
  }
  if (hideCommissionOnly) query = query.eq("is_100_percent_commission", false);

  switch (sortBy) {
    case "highest_tier":
      query = query
        .order("tier_level", { referencedTable: "employers", ascending: true })
        .order("created_at", { ascending: false });
      break;
    case "highest_salary":
      query = query.order("salary_max", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + LIMIT - 1);

  const { data, count } = await query;
  const total = count || 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <JobList listings={data || []} total={total} />
      <div className="mt-6">
        <JobPagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          limit={LIMIT}
        />
      </div>
    </>
  );
}
