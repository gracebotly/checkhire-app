import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { SeekerApplicationDetailClient } from "./client";

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
        current_application_count, max_applications,
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
    <SeekerApplicationDetailClient
      application={{
        id: application.id,
        pseudonym: application.pseudonym,
        disclosure_level: application.disclosure_level as 1 | 2 | 3,
        status: application.status,
        screening_responses: application.screening_responses as Record<string, unknown> | null,
        created_at: application.created_at,
        disclosed_at_stage2: application.disclosed_at_stage2,
        disclosed_at_stage3: application.disclosed_at_stage3,
      }}
      listing={listing ? {
        title: listing.title,
        slug: listing.slug,
        remote_type: listing.remote_type,
        expires_at: listing.expires_at,
        current_application_count: listing.current_application_count,
        max_applications: listing.max_applications,
      } : null}
      employer={employer ? {
        company_name: employer.company_name,
        tier_level: employer.tier_level as 1 | 2 | 3,
      } : null}
      questions={questions}
      userId={user.id}
    />
  );
}
