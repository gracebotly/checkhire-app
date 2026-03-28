import type {
  SeekerProfile,
  Application,
  CandidateView,
  DisclosureLevel,
} from "@/types/database";

/**
 * Builds a disclosure-gated candidate view based on the application's
 * disclosure_level. This is the SINGLE place where field visibility
 * is determined — every API route that returns candidate data MUST
 * pass through this function.
 *
 * Stage 1: pseudonym + skills/experience/work history (no PII)
 * Stage 2: + first name
 * Stage 3: + full name + resume URL (provided separately via signed URL)
 */
export function buildCandidateView(
  application: Application,
  seekerProfile: SeekerProfile,
  fullName: string | null,
  resumeSignedUrl?: string
): CandidateView {
  const level: DisclosureLevel = application.disclosure_level as DisclosureLevel;

  // Stage 1 — always visible
  const view: CandidateView = {
    application_id: application.id,
    pseudonym: application.pseudonym,
    disclosure_level: level,
    status: application.status,
    created_at: application.created_at,

    skills: seekerProfile.skills ?? [],
    years_experience: seekerProfile.years_experience,
    location_city: seekerProfile.location_city,
    location_state: seekerProfile.location_state,
    education_level: seekerProfile.education_level,
    education_field: seekerProfile.education_field,
    parsed_work_history: seekerProfile.parsed_work_history ?? [],
    parsed_education: seekerProfile.parsed_education ?? [],
    parsed_certifications: seekerProfile.parsed_certifications ?? [],
    parsed_summary: seekerProfile.parsed_summary,
    screening_responses: application.screening_responses,
    video_responses: application.video_responses ?? [],
    screening_score: application.screening_score ?? null,
  };

  // Stage 2 — first name
  if (level >= 2 && fullName) {
    view.first_name = fullName.split(" ")[0] || undefined;
  }

  // Stage 3 — full name + resume
  if (level >= 3) {
    if (fullName) {
      view.full_name = fullName;
    }
    if (resumeSignedUrl) {
      view.resume_url = resumeSignedUrl;
    }
  }

  return view;
}
