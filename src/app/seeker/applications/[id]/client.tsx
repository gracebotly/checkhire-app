"use client";

import { TierBadge } from "@/components/jobs/TierBadge";
import { DisclosureTimeline } from "@/components/seeker/DisclosureTimeline";
import { InterviewResponseCard } from "@/components/seeker/InterviewResponseCard";
import { TrustShield } from "@/components/seeker/TrustShield";
import { ConfirmInterviewDoneButton } from "@/components/chat/ConfirmInterviewDoneButton";
import { PageHeader } from "@/components/layout/page-header";
import type { DisclosureLevel, TierLevel } from "@/types/database";
import { ArrowLeft, Eye, Lock, MessageSquare, Shield } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  applied: { label: "Applied", color: "bg-blue-50 text-blue-700 border-blue-200" },
  reviewed: { label: "Reviewed", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  shortlisted: { label: "Shortlisted", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  interview_requested: { label: "Interview Requested", color: "bg-amber-50 text-amber-700 border-amber-200" },
  interview_accepted: { label: "Interview Accepted", color: "bg-brand-muted text-brand border-brand/20" },
  offered: { label: "Offer Received", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Not Selected", color: "bg-gray-50 text-slate-600 border-gray-200" },
  hired: { label: "Hired", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

const DISCLOSURE_FIELDS = {
  1: {
    visible: ["Skills", "Years of experience", "Location (city/state)", "Education", "Work history (titles & companies)", "Screening answers"],
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

interface Props {
  application: {
    id: string;
    pseudonym: string;
    disclosure_level: DisclosureLevel;
    status: string;
    screening_responses: Record<string, unknown> | null;
    created_at: string;
    disclosed_at_stage2: string | null;
    disclosed_at_stage3: string | null;
  };
  listing: { title: string; slug: string; remote_type: string } | null;
  employer: { company_name: string; tier_level: TierLevel } | null;
  questions: { id: string; question_text: string; question_type: string }[];
  userId: string;
}

export function SeekerApplicationDetailClient({
  application: initialApp,
  listing,
  employer,
  questions,
  userId,
}: Props) {
  const [app, setApp] = useState(initialApp);

  const statusInfo = STATUS_LABELS[app.status] || STATUS_LABELS.applied;
  const disclosureInfo = DISCLOSURE_FIELDS[app.disclosure_level] || DISCLOSURE_FIELDS[1];

  const handleInterviewResponse = (accepted: boolean) => {
    if (accepted) {
      setApp((prev) => ({ ...prev, status: "interview_accepted", disclosure_level: 2 as DisclosureLevel }));
    } else {
      setApp((prev) => ({ ...prev, status: "rejected" }));
    }
  };

  const handleInterviewConfirmed = () => {
    setApp((prev) => ({ ...prev, disclosure_level: 3 as DisclosureLevel }));
  };

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

        {/* Interview response card (only when interview_requested) */}
        {app.status === "interview_requested" && employer && (
          <div className="mb-4">
            <InterviewResponseCard
              applicationId={app.id}
              companyName={employer.company_name}
              onResponded={handleInterviewResponse}
            />
          </div>
        )}

        {/* Application header */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-muted px-3 py-1.5 text-sm font-bold text-brand">
                  <Shield className="h-4 w-4" />
                  {app.pseudonym}
                </span>
                <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${statusInfo.color}`}>
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
                    {employer && <TierBadge tier={employer.tier_level} size="sm" />}
                  </div>
                </div>
              )}
              <p className="mt-2 text-xs text-slate-600">
                Applied {new Date(app.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>

            {/* Chat + Confirm buttons */}
            <div className="flex shrink-0 flex-col gap-2">
              <Link
                href={`/seeker/messages/${app.id}`}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
              >
                <MessageSquare className="h-3 w-3" />
                Open Chat
              </Link>
              {app.status === "interview_accepted" && (
                <ConfirmInterviewDoneButton
                  applicationId={app.id}
                  applicationStatus={app.status}
                  onConfirmed={handleInterviewConfirmed}
                />
              )}
            </div>
          </div>
        </div>

        {/* Trust Shield + Disclosure Timeline */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TrustShield disclosureLevel={app.disclosure_level} />
          <DisclosureTimeline currentLevel={app.disclosure_level} />
        </div>

        {/* What employer can see */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-900">
            What the employer can see (Stage {app.disclosure_level})
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

        {/* Screening answers */}
        {questions.length > 0 && app.screening_responses && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900">Your screening answers</h3>
            <div className="mt-3 space-y-3">
              {questions.map((q, i) => {
                const answer = app.screening_responses?.[q.id];
                return (
                  <div key={q.id} className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-slate-900">{i + 1}. {q.question_text}</p>
                    <p className="mt-1 text-sm text-slate-600">{answer != null ? String(answer) : "—"}</p>
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
