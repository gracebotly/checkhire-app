import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Globe,
  Building,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { TierBadge } from "@/components/jobs/TierBadge";
import { CompensationDisplay } from "@/components/jobs/CompensationDisplay";
import { CommissionWarning } from "@/components/jobs/CommissionWarning";
import { RemoteTag } from "@/components/jobs/RemoteTag";
import { PayTypeBadge } from "@/components/jobs/PayTypeBadge";
import { DaysRemaining } from "@/components/jobs/DaysRemaining";
import { ApplicationCount } from "@/components/jobs/ApplicationCount";
import { TrustSignalBar } from "@/components/jobs/TrustSignalBar";
import { ScreeningRequirements } from "@/components/jobs/ScreeningRequirements";
import { JobDetailStickyBar } from "@/components/jobs/JobDetailStickyBar";
import { ApplyButton } from "@/components/jobs/ApplyButton";
import { ReportListingButton } from "@/components/jobs/ReportListingButton";
import { formatPostedDate } from "@/lib/formatting";
import { generateListingMetadata, generateJobPostingJsonLd } from "@/lib/seo";
import type { TierLevel, CommissionStructure, ScreeningQuestion } from "@/types/database";

// ─── Metadata ───
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: listing } = await supabase
    .from("job_listings")
    .select("title, salary_min, salary_max, pay_type, remote_type, employers(company_name)")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!listing) {
    return { title: "Job Not Found" };
  }

  const employerData = Array.isArray(listing.employers)
    ? listing.employers[0]
    : listing.employers;

  return generateListingMetadata({
    title: listing.title,
    salary_min: listing.salary_min,
    salary_max: listing.salary_max,
    pay_type: listing.pay_type,
    remote_type: listing.remote_type,
    employers: employerData as { company_name: string },
  });
}

// ─── Page ───
export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: listing } = await supabase
    .from("job_listings")
    .select(
      `
      *,
      employers (
        id, company_name, tier_level, logo_url, transparency_score,
        industry, company_size, website_domain, description, country, slug,
        video_url, identity_verified, linkedin_verified,
        domain_email_verified_at, outreach_status, verification_card_public
      )
    `
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!listing) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("screening_questions")
    .select("id, question_text, question_type, options, required, sort_order")
    .eq("job_listing_id", listing.id)
    .order("sort_order", { ascending: true });

  const employer = listing.employers as {
    id: string;
    company_name: string;
    tier_level: number;
    logo_url: string | null;
    transparency_score: number;
    industry: string | null;
    company_size: string | null;
    website_domain: string | null;
    description: string | null;
    country: string;
    slug: string | null;
    video_url: string | null;
    identity_verified: boolean;
    linkedin_verified: boolean;
    domain_email_verified_at: string | null;
    outreach_status: string | null;
    verification_card_public: boolean;
  };
  const companyInitial = employer.company_name?.charAt(0)?.toUpperCase() || "C";
  const location =
    listing.remote_type === "full_remote"
      ? "Anywhere"
      : [listing.location_city, listing.location_state].filter(Boolean).join(", ") ||
        listing.location_country;

  const remoteIcon =
    listing.remote_type === "full_remote"
      ? Globe
      : listing.remote_type === "hybrid"
        ? Building
        : MapPin;
  const RemoteIcon = remoteIcon;

  const jsonLd = generateJobPostingJsonLd({ ...listing, employers: employer });

  return (
    <>
      {/* JSON-LD for Google Jobs */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Back link */}
        <Link
          href="/jobs"
          className="mb-6 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>

        {/* ─── Header ─── */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {employer.logo_url ? (
                <Image
                  src={employer.logo_url}
                  alt={employer.company_name}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-600">
                  {companyInitial}
                </div>
              )}
              <div>
                <Link
                  href={`/employers/${employer.slug}`}
                  className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-brand"
                >
                  {employer.company_name}
                </Link>
                <h1 className="mt-0.5 font-display text-2xl font-bold text-slate-900">
                  {listing.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <RemoteTag remoteType={listing.remote_type} />
                  <PayTypeBadge payType={listing.pay_type} />
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <RemoteIcon className="h-4 w-4" />
                    {location}
                  </span>
                </div>
              </div>
            </div>
            <TierBadge tier={employer.tier_level as TierLevel} size="md" />
          </div>

          {/* Compensation */}
          <div className="mt-5 border-t border-gray-100 pt-5">
            {listing.is_100_percent_commission ? (
              <div>
                <CommissionWarning />
                {listing.commission_structure && (() => {
                  const cs = listing.commission_structure as CommissionStructure;
                  return (
                    <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                      {cs.average_earnings && (
                        <div>
                          <p className="text-xs text-slate-600">Avg. earnings</p>
                          <p className="font-semibold tabular-nums text-slate-900">
                            ${cs.average_earnings.toLocaleString()}/yr
                          </p>
                        </div>
                      )}
                      {cs.time_to_first_payment && (
                        <div>
                          <p className="text-xs text-slate-600">Time to first payment</p>
                          <p className="font-semibold text-slate-900">
                            {cs.time_to_first_payment}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-600">Leads provided</p>
                        <p className="font-semibold text-slate-900">
                          {cs.leads_provided ? "Yes" : "No — you generate your own"}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <CompensationDisplay
                salaryMin={listing.salary_min}
                salaryMax={listing.salary_max}
                payType={listing.pay_type}
                commissionStructure={listing.commission_structure}
                oteMin={listing.ote_min}
                oteMax={listing.ote_max}
                is100PercentCommission={false}
                size="lg"
              />
            )}
          </div>

          {/* Meta row */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <DaysRemaining expiresAt={listing.expires_at} />
            <ApplicationCount
              current={listing.current_application_count}
              max={listing.max_applications}
            />
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatPostedDate(listing.created_at)}
            </span>
          </div>
        </div>

        {/* ─── Trust Signal Bar ─── */}
        <div className="mt-4">
          <TrustSignalBar
            tier={employer.tier_level as TierLevel}
            respondByDate={listing.respond_by_date}
            fillByDate={listing.fill_by_date}
            transparencyScore={employer.transparency_score}
          />
        </div>

        {/* ─── Two column layout: content + sidebar ─── */}
        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          {/* Main content */}
          <div className="min-w-0 flex-1 space-y-6">
            {/* Job description */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                About this role
              </h2>
              <div className="prose-sm mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {listing.description}
              </div>
            </div>

            {/* Remote details */}
            {(listing.timezone_requirements || listing.equipment_policy) && (
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Remote work details
                </h2>
                <div className="mt-3 space-y-3">
                  {listing.timezone_requirements && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600">
                        Timezone
                      </p>
                      <p className="mt-0.5 text-sm text-slate-900">
                        {listing.timezone_requirements}
                      </p>
                    </div>
                  )}
                  {listing.equipment_policy && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600">
                        Equipment
                      </p>
                      <p className="mt-0.5 text-sm text-slate-900">
                        {listing.equipment_policy}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full space-y-4 lg:w-72">
            {/* Apply CTA */}
            <ApplyButton
              listingId={listing.id}
              listingTitle={listing.title}
              requiresScreeningQuiz={listing.requires_screening_quiz}
              screeningQuestions={(questions || []) as ScreeningQuestion[]}
              applicationsClosed={
                listing.current_application_count >= listing.max_applications
              }
            />

            {/* Screening requirements */}
            <ScreeningRequirements
              requiresVideo={listing.requires_video_application}
              requiresQuiz={listing.requires_screening_quiz}
              questionCount={questions?.length || 0}
            />

            {/* About the employer */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                About {employer.company_name}
              </h3>
              {employer.description && (
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {employer.description.length > 200
                    ? employer.description.slice(0, 200) + "..."
                    : employer.description}
                </p>
              )}
              <div className="mt-3 space-y-1.5">
                {employer.industry && (
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">Industry:</span>{" "}
                    {employer.industry}
                  </p>
                )}
                {employer.company_size && (
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">Size:</span>{" "}
                    {employer.company_size} employees
                  </p>
                )}
                {employer.website_domain && (
                  <a
                    href={`https://${employer.website_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {employer.website_domain}
                  </a>
                )}
              </div>
              {employer.slug && (
                <Link
                  href={`/employers/${employer.slug}`}
                  className="mt-3 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand transition-colors duration-200 hover:text-brand-hover"
                >
                  View company profile
                </Link>
              )}
            </div>

            {/* Report listing */}
            <div className="flex justify-center">
              <ReportListingButton listingId={listing.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <JobDetailStickyBar
        salaryMin={listing.salary_min}
        salaryMax={listing.salary_max}
        payType={listing.pay_type}
        is100PercentCommission={listing.is_100_percent_commission}
      />
    </>
  );
}
