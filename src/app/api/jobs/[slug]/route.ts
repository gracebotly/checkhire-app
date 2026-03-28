import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/jobs/[slug] — Single job listing with employer profile and screening questions.
 * Public — no authentication required.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createServiceClient();

  // Fetch listing + employer
  const { data: listing, error } = await supabase
    .from("job_listings")
    .select(
      `
      *,
      employers (
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
        verification_card_public
      )
    `
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[api/jobs/slug] Query error:", error.message);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch listing" },
      { status: 500 }
    );
  }

  if (!listing) {
    return NextResponse.json(
      { ok: false, error: "Listing not found" },
      { status: 404 }
    );
  }

  // Fetch screening questions for this listing (question text and type only — not responses)
  const { data: questions } = await supabase
    .from("screening_questions")
    .select("id, question_text, question_type, options, required, sort_order")
    .eq("job_listing_id", listing.id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    ok: true,
    listing: {
      ...listing,
      screening_questions: questions || [],
    },
  });
}
