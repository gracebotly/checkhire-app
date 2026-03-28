import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe, Building2, Users, Calendar, ExternalLink } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { TierBadge } from "@/components/jobs/TierBadge";
import { JobCard } from "@/components/jobs/JobCard";
import { generateEmployerMetadata } from "@/lib/seo";
import type { TierLevel, JobListingWithEmployer } from "@/types/database";

// ─── Metadata ───
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: employer } = await supabase
    .from("employers")
    .select("company_name, industry, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!employer) {
    return { title: "Company Not Found" };
  }

  return generateEmployerMetadata(employer);
}

// ─── Page ───
export default async function EmployerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: employer } = await supabase
    .from("employers")
    .select(
      `
      id, company_name, tier_level, logo_url, transparency_score,
      industry, company_size, website_domain, description, country, slug,
      video_url, identity_verified, linkedin_verified,
      domain_email_verified_at, outreach_status, outreach_confirmed_at,
      verification_card_public, created_at
    `
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!employer) {
    notFound();
  }

  const { data: listings } = await supabase
    .from("job_listings")
    .select(
      `
      *,
      employers!inner (
        company_name, tier_level, logo_url, transparency_score,
        industry, company_size, website_domain, description, country, slug
      )
    `
    )
    .eq("employer_id", employer.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const companyInitial = employer.company_name?.charAt(0)?.toUpperCase() || "C";

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Back link */}
      <Link
        href="/jobs"
        className="mb-6 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      {/* ─── Company Header ─── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {employer.logo_url ? (
              <Image
                src={employer.logo_url}
                alt={employer.company_name}
                width={64}
                height={64}
                className="h-16 w-16 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl font-bold text-slate-600">
                {companyInitial}
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                {employer.company_name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                {employer.industry && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {employer.industry}
                  </span>
                )}
                {employer.company_size && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {employer.company_size} employees
                  </span>
                )}
                {employer.country && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    {employer.country}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  On CheckHire since{" "}
                  {new Date(employer.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
          <TierBadge tier={employer.tier_level as TierLevel} size="md" />
        </div>

        {/* Description */}
        {employer.description && (
          <div className="mt-5 border-t border-gray-100 pt-5">
            <h2 className="text-sm font-semibold text-slate-900">About</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {employer.description}
            </p>
          </div>
        )}

        {/* Website link */}
        {employer.website_domain && (
          <div className="mt-4">
            <a
              href={`https://${employer.website_domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
            >
              <ExternalLink className="h-4 w-4" />
              {employer.website_domain}
            </a>
          </div>
        )}
      </div>

      {/* ─── Verification Summary (placeholder for Slice 7 verification card) ─── */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          Verification status
        </h2>
        <div className="mt-3 flex items-center gap-3">
          <TierBadge tier={employer.tier_level as TierLevel} size="md" />
          <span className="text-xs text-slate-600">
            {employer.transparency_score > 0
              ? `Employer score: ${employer.transparency_score}/5.0`
              : "Employer score will appear after first hire"}
          </span>
        </div>
      </div>

      {/* ─── Open Positions ─── */}
      <div className="mt-8">
        <h2 className="font-display text-xl font-bold text-slate-900">
          Open positions
          {listings && listings.length > 0 && (
            <span className="ml-2 text-base font-medium text-slate-600">
              ({listings.length})
            </span>
          )}
        </h2>
        {listings && listings.length > 0 ? (
          <div className="mt-4 space-y-4">
            {listings.map((listing: JobListingWithEmployer, index: number) => (
              <JobCard
                key={listing.id}
                listing={listing as JobListingWithEmployer}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
            <p className="text-sm text-slate-600">
              No open positions at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
