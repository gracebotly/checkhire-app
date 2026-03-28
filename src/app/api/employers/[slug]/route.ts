import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/employers/[slug] — Public employer profile with active listings.
 * No authentication required.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createServiceClient();

  // Fetch employer profile
  const { data: employer, error } = await supabase
    .from("employers")
    .select(
      `
      id,
      company_name,
      tier_level,
      logo_url,
      transparency_score,
      industry,
      company_size,
      website_domain,
      description,
      country,
      slug,
      video_url,
      identity_verified,
      linkedin_verified,
      domain_email_verified_at,
      outreach_status,
      outreach_confirmed_at,
      verification_card_public,
      created_at
    `
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[api/employers/slug] Query error:", error.message);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch employer" },
      { status: 500 }
    );
  }

  if (!employer) {
    return NextResponse.json(
      { ok: false, error: "Employer not found" },
      { status: 404 }
    );
  }

  // Fetch active listings from this employer
  const { data: listings } = await supabase
    .from("job_listings")
    .select(
      `
      id, title, job_type, category, salary_min, salary_max, pay_type,
      commission_structure, ote_min, ote_max, is_100_percent_commission,
      remote_type, location_city, location_state, location_country,
      requires_video_application, requires_screening_quiz,
      max_applications, current_application_count, slug,
      created_at, expires_at
    `
    )
    .eq("employer_id", employer.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return NextResponse.json({
    ok: true,
    employer,
    listings: listings || [],
  });
}
