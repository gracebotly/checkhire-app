"use client";

import {
  Briefcase,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  GraduationCap,
  MapPin,
  MessageSquare,
  Shield,
  User,
  Video,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { InterviewRequestButton } from "./InterviewRequestButton";
import { VideoPlaybackCard } from "./VideoPlaybackCard";
import { MaskedEmailDisplay } from "./MaskedEmailDisplay";
import { InterviewScheduleForm } from "@/components/chat/InterviewScheduleForm";
import { DisclosureProgressBar } from "./DisclosureProgressBar";
import { ConfirmInterviewDoneButton } from "@/components/chat/ConfirmInterviewDoneButton";
import Link from "next/link";
import type { CandidateView } from "@/types/database";

interface CandidateCardProps {
  candidate: CandidateView;
  onStatusChange: (applicationId: string, newStatus: string) => void;
}

function MaskedEmailDisplayLoader({ applicationId }: { applicationId: string }) {
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/employer/applications/${applicationId}/masked-email`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.applicant_masked_email) {
          setMaskedEmail(data.applicant_masked_email);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [applicationId]);

  if (!loaded || !maskedEmail) return null;
  return <MaskedEmailDisplay applicantMaskedEmail={maskedEmail} />;
}

export function CandidateCard({ candidate, onStatusChange }: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false);

  const STATUS_COLORS: Record<string, string> = {
    applied: "bg-blue-50 text-blue-700 border-blue-200",
    reviewed: "bg-cyan-50 text-cyan-700 border-cyan-200",
    shortlisted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    interview_requested: "bg-amber-50 text-amber-700 border-amber-200",
    interview_accepted: "bg-brand-muted text-brand border-brand/20",
    offered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    hired: "bg-emerald-50 text-emerald-800 border-emerald-200",
    rejected: "bg-gray-50 text-slate-600 border-gray-200",
    withdrawn: "bg-orange-50 text-orange-700 border-orange-200",
  };

  const statusColor = STATUS_COLORS[candidate.status] || STATUS_COLORS.applied;

  // Display name based on disclosure level
  let displayName = candidate.pseudonym;
  if (candidate.disclosure_level >= 3 && candidate.full_name) {
    displayName = candidate.full_name;
  } else if (candidate.disclosure_level >= 2 && candidate.first_name) {
    displayName = candidate.first_name;
  }

  const showPseudonym = candidate.disclosure_level === 1;

  return (
    <div
      className="select-none rounded-xl border border-gray-200 bg-white p-5"
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Identity row */}
          <div className="flex items-center gap-2">
            {showPseudonym ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-muted px-2.5 py-1 text-sm font-bold text-brand">
                <Shield className="h-4 w-4" />
                {candidate.pseudonym}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-muted px-2.5 py-1 text-sm font-bold text-brand">
                <User className="h-4 w-4" />
                {displayName}
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${statusColor}`}
            >
              {candidate.status.replace(/_/g, " ")}
            </span>
          </div>

          {/* Disclosure indicator */}
          <div className="mt-1.5">
            <DisclosureProgressBar level={candidate.disclosure_level} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            {candidate.screening_score != null && candidate.screening_score > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-700 border border-emerald-200">
                Score: {candidate.screening_score}
              </span>
            )}
            {candidate.video_responses && candidate.video_responses.length > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                <Video className="h-3 w-3" />
                {candidate.video_responses.length} video{candidate.video_responses.length !== 1 ? "s" : ""}
              </span>
            )}
            {candidate.years_experience != null && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {candidate.years_experience} yrs experience
              </span>
            )}
            {(candidate.location_city || candidate.location_state) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[candidate.location_city, candidate.location_state]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}
            {candidate.education_level && (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                {candidate.education_level}
              </span>
            )}
          </div>

          {candidate.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {candidate.skills.slice(0, 8).map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-slate-600"
                >
                  {skill}
                </span>
              ))}
              {candidate.skills.length > 8 && (
                <span className="rounded-md bg-gray-50 px-2 py-0.5 text-xs text-slate-600">
                  +{candidate.skills.length - 8} more
                </span>
              )}
            </div>
          )}

          {candidate.parsed_summary && (
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {candidate.parsed_summary}
            </p>
          )}
        </div>

        {/* Actions column */}
        <div className="flex shrink-0 flex-col gap-1.5">
          {/* Chat link — always available */}
          <Link
            href={`/employer/messages/${candidate.application_id}`}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50"
          >
            <MessageSquare className="h-3 w-3" />
            Chat
          </Link>

          {/* Status-specific actions */}
          {candidate.status === "applied" && (
            <>
              <button
                onClick={() => onStatusChange(candidate.application_id, "shortlisted")}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors duration-200 hover:bg-emerald-100"
              >
                <CheckCircle className="h-3 w-3" />
                Shortlist
              </button>
              <button
                onClick={() => onStatusChange(candidate.application_id, "reviewed")}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50"
              >
                <Eye className="h-3 w-3" />
                Mark Reviewed
              </button>
            </>
          )}
          {candidate.status === "reviewed" && (
            <>
              <button
                onClick={() => onStatusChange(candidate.application_id, "shortlisted")}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors duration-200 hover:bg-emerald-100"
              >
                <CheckCircle className="h-3 w-3" />
                Shortlist
              </button>
              <InterviewRequestButton
                applicationId={candidate.application_id}
                currentStatus={candidate.status}
                onStatusChange={onStatusChange}
              />
            </>
          )}
          {candidate.status === "shortlisted" && (
            <InterviewRequestButton
              applicationId={candidate.application_id}
              currentStatus={candidate.status}
              onStatusChange={onStatusChange}
            />
          )}
          {candidate.status === "interview_accepted" && (
            <>
              <InterviewScheduleForm
                applicationId={candidate.application_id}
                candidateName={displayName}
              />
              <ConfirmInterviewDoneButton
                applicationId={candidate.application_id}
                applicationStatus={candidate.status}
              />
            </>
          )}
          {["applied", "reviewed", "shortlisted"].includes(candidate.status) && (
            <button
              onClick={() => onStatusChange(candidate.application_id, "rejected")}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors duration-200 hover:bg-red-50"
            >
              <XCircle className="h-3 w-3" />
              Reject
            </button>
          )}
        </div>
      </div>

      {/* Masked email — shown at Stage 2+ */}
      {candidate.disclosure_level >= 2 && candidate.application_id && (
        <MaskedEmailDisplayLoader applicationId={candidate.application_id} />
      )}

      {/* Video responses */}
      {candidate.video_responses && candidate.video_responses.length > 0 && (
        <VideoPlaybackCard applicationId={candidate.application_id} />
      )}

      {/* Work history expandable */}
      {candidate.parsed_work_history.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Hide" : "Show"} work history ({candidate.parsed_work_history.length})
          </button>
          {expanded && (
            <div className="mt-2 space-y-2 border-t border-gray-100 pt-3">
              {candidate.parsed_work_history.map((entry, i) => (
                <div key={i} className="text-xs">
                  <p className="font-medium text-slate-900">{entry.title}</p>
                  <p className="text-slate-600">
                    {entry.company} {entry.start_date && `· ${entry.start_date}`}
                    {entry.end_date
                      ? ` – ${entry.end_date}`
                      : entry.start_date
                        ? " – Present"
                        : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
