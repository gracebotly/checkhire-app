import { TierBadge } from "@/components/jobs/TierBadge";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Building, Eye, Globe, Lock, MapPin, Shield } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { TierLevel } from "@/types/database";

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

const DISCLOSURE_FIELDS = {
  1: {
    visible: [
      "Skills",
      "Years of experience",
      "Location (city/state)",
      "Education",
      "Work history (titles & companies)",
      "Screening answers",
    ],
    hidden: ["Your name", "Email address", "Phone number", "Resume PDF"],
  },
  2: {
    visible: ["Everything in Stage 1", "Your first name"],
    hidden: ["Last name", "Email address", "Phone number", "Resume PDF"],
  },
  3: {
    visible: ["Everything in Stage 2", "Full name", "Resume PDF"],
    hidden: ["Email address", "Phone number"],
  },
};

export default async function SeekerApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: application } = await supabase
    .from("applications")
    .select(`
      id, pseudonym, disclosure_level, status, screening_responses, created_at,
      disclosed_at_stage2, disclosed_at_stage3,
      job_listings (
        id, title, slug, job_type, pay_type, salary_min, salary_max,
        remote_type, location_city, location_state, status,
        created_at, expires_at, requires_screening_quiz,
        employers ( company_name, tier_level, logo_url, slug, industry )
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!application) notFound();

  const listing = Array.isArray(application.job_listings)
    ? application.job_listings[0]
    : application.job_listings;
  const employer = listing
    ? Array.isArray(listing.employers)
      ? listing.employers[0]
      : listing.employers
    : null;

  const statusInfo = STATUS_LABELS[application.status] || STATUS_LABELS.applied;
  const disclosureInfo =
    DISCLOSURE_FIELDS[application.disclosure_level as 1 | 2 | 3] ||
    DISCLOSURE_FIELDS[1];

  const RemoteIcon =
    listing?.remote_type === "full_remote"
      ? Globe
      : listing?.remote_type === "hybrid"
        ? Building
        : MapPin;

  let questions: { id: string; question_text: string; question_type: string }[] = [];
  if (listing?.requires_screening_quiz) {
    const { data: q } = await supabase
      .from("screening_questions")
      .select("id, question_text, question_type")
      .eq("job_listing_id", listing.id)
      .order("sort_order", { ascending: true });
    questions = q || [];
  }

  return (
    <div className="min-h-screen">
      <PageHeader title="Application Detail" />
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/seeker/applications"
          className="mb-6 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to applications
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-muted px-3 py-1.5 text-sm font-bold text-brand">
                  <Shield className="h-4 w-4" />
                  {application.pseudonym}
                </span>
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${statusInfo.color}`}
                >
                  {statusInfo.label}
                </span>
              </div>
              {listing && (
                <div className="mt-3">
                  <Link
                    href={`/jobs/${listing.slug}`}
                    className="cursor-pointer font-display text-lg font-semibold text-slate-900 transition-colors duration-200 hover:text-brand"
                  >
                    {listing.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-600">
                    <span>{employer?.company_name}</span>
                    {employer && <TierBadge tier={employer.tier_level as TierLevel} size="sm" />}
                    <span className="flex items-center gap-1">
                      <RemoteIcon className="h-3 w-3" />
                      {listing.remote_type === "full_remote"
                        ? "Remote"
                        : listing.remote_type === "hybrid"
                          ? "Hybrid"
                          : "On-site"}
                    </span>
                  </div>
                </div>
              )}
              <p className="mt-2 text-xs text-slate-600">
                Applied{" "}
                {new Date(application.created_at).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-900">
            What the employer can see (Stage {application.disclosure_level})
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-emerald-700">Visible to employer</p>
              <div className="space-y-1.5">
                {disclosureInfo.visible.map((field) => (
                  <div key={field} className="flex items-center gap-2 text-xs text-slate-900">
                    <Eye className="h-3 w-3 shrink-0 text-emerald-600" />
                    {field}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-slate-600">Hidden from employer</p>
              <div className="space-y-1.5">
                {disclosureInfo.hidden.map((field) => (
                  <div key={field} className="flex items-center gap-2 text-xs text-slate-600">
                    <Lock className="h-3 w-3 shrink-0 text-slate-600" />
                    {field}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {questions.length > 0 && application.screening_responses && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900">Your screening answers</h3>
            <div className="mt-3 space-y-3">
              {questions.map((q, i) => {
                const answer = (application.screening_responses as Record<string, unknown>)?.[
                  q.id
                ];
                return (
                  <div key={q.id} className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-slate-900">
                      {i + 1}. {q.question_text}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {answer != null ? String(answer) : "—"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
