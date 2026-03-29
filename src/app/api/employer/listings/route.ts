import { NextResponse } from "next/server";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createListingSchema } from "@/lib/validation/listingSchema";
import { screeningQuestionSchema, detectBlockedKeyword } from "@/lib/validation/screeningSchema";
import { scoreMlmIndicators, MLM_REVIEW_THRESHOLD } from "@/lib/employer/mlmDetection";
import { generateListingSlug } from "@/lib/employer/generateSlug";
import { scanListingDescription } from "@/lib/screening/piiScanListingDescription";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employer/listings — List current employer's listings (all statuses).
 */
export const GET = withApiHandler(async function GET() {
  const ctx = await getEmployerForUser();

  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  const supabase = await createClient();

  const { data: listings, error } = await supabase
    .from("job_listings")
    .select(
      `
      id, title, job_type, category, salary_min, salary_max, pay_type,
      commission_structure, ote_min, ote_max, is_100_percent_commission,
      remote_type, location_city, location_state, location_country,
      status, close_reason, escrow_status,
      requires_video_application, requires_screening_quiz,
      max_applications, current_application_count,
      mlm_flag_score, slug, created_at, expires_at, updated_at
    `
    )
    .eq("employer_id", ctx.employerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/employer/listings] Query error:", error.message);
    return NextResponse.json(
      { ok: false, code: "QUERY_FAILED", message: "Failed to load listings." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, listings: listings || [] });
});

/**
 * POST /api/employer/listings — Create a new job listing.
 * Validates fields, runs MLM detection, auto-classifies gig/temp,
 * sets 45-day expiration, generates slug, creates screening_questions.
 */
export const POST = withApiHandler(async function POST(req: Request) {
  const ctx = await getEmployerForUser();

  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  // Guard: employer must have verified domain email before posting
  if (!ctx.employer.domain_email_verified_at) {
    return NextResponse.json(
      {
        ok: false,
        code: "DOMAIN_NOT_VERIFIED",
        message:
          "You must verify your company email before posting a listing. Go to Settings → Verify Email.",
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));

  // Validate listing fields
  const listingResult = createListingSchema.safeParse(body);
  if (!listingResult.success) {
    const firstError = listingResult.error.errors[0];
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: firstError?.message || "Invalid listing data.",
        field: firstError?.path?.join("."),
      },
      { status: 400 }
    );
  }

  const input = listingResult.data;

  // Scan listing description for PII requests (HARD BLOCK)
  const descriptionScan = scanListingDescription(input.description);
  if (descriptionScan.flagged) {
    return NextResponse.json(
      {
        ok: false,
        code: "DESCRIPTION_PII_BLOCKED",
        message: descriptionScan.warnings[0],
        all_warnings: descriptionScan.warnings,
      },
      { status: 400 }
    );
  }

  // Validate screening questions if provided
  const rawQuestions = Array.isArray(body.screening_questions) ? body.screening_questions : [];
  const validatedQuestions: Array<{
    question_text: string;
    question_type: string;
    options: string[] | null;
    required: boolean;
    sort_order: number;
  }> = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i];
    const qResult = screeningQuestionSchema.safeParse({ ...q, sort_order: i });
    if (!qResult.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "SCREENING_VALIDATION_ERROR",
          message: `Question ${i + 1}: ${qResult.error.errors[0]?.message}`,
        },
        { status: 400 }
      );
    }

    // Check for blocked keywords
    const blocked = detectBlockedKeyword(qResult.data.question_text);
    if (blocked) {
      return NextResponse.json(
        {
          ok: false,
          code: "BLOCKED_QUESTION",
          message: `Question ${i + 1} contains prohibited content ("${blocked}"). Employers cannot request sensitive personal information through screening questions.`,
        },
        { status: 400 }
      );
    }

    validatedQuestions.push(qResult.data);
  }

  // Auto-classify gig/temp based on job_type
  const isGigTemp = ["gig", "temp"].includes(input.job_type);

  // Set escrow status
  const escrowStatus = isGigTemp ? "pending_funding" : "not_applicable";

  // Generate slug
  const slug = generateListingSlug(input.title);

  // Run MLM detection
  const mlmScore = await scoreMlmIndicators(input.title, input.description);
  const status = mlmScore >= MLM_REVIEW_THRESHOLD ? "review_pending" : "active";

  // Find the employer_user id for posted_by
  const { data: employerUser } = await supabaseAdmin
    .from("employer_users")
    .select("id")
    .eq("employer_id", ctx.employerId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  // Calculate expiration (45 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 45);

  // Create listing
  const { data: listing, error: insertError } = await supabaseAdmin
    .from("job_listings")
    .insert({
      employer_id: ctx.employerId,
      posted_by: employerUser?.id || null,
      title: input.title,
      description: input.description,
      job_type: input.job_type,
      category: input.category,
      salary_min: input.salary_min,
      salary_max: input.salary_max,
      pay_type: input.pay_type,
      commission_structure: input.commission_structure,
      ote_min: input.ote_min,
      ote_max: input.ote_max,
      is_100_percent_commission: input.is_100_percent_commission,
      remote_type: input.remote_type,
      location_city: input.location_city || null,
      location_state: input.location_state || null,
      location_country: input.location_country,
      timezone_requirements: input.timezone_requirements || null,
      equipment_policy: input.equipment_policy || null,
      respond_by_date: input.respond_by_date || null,
      fill_by_date: input.fill_by_date || null,
      max_applications: input.max_applications,
      requires_video_application: input.requires_video_application,
      video_questions: Array.isArray(body.video_questions) ? body.video_questions : [],
      requires_screening_quiz: validatedQuestions.length > 0,
      mlm_flag_score: mlmScore,
      slug,
      status,
      escrow_status: escrowStatus,
      expires_at: expiresAt.toISOString(),
    })
    .select("id, slug, status, mlm_flag_score")
    .single();

  if (insertError) {
    console.error("[api/employer/listings] Insert error:", insertError.message);
    return NextResponse.json(
      { ok: false, code: "INSERT_FAILED", message: "Failed to create listing." },
      { status: 500 }
    );
  }

  // Create screening questions
  if (validatedQuestions.length > 0 && listing) {
    const questionsToInsert = validatedQuestions.map((q) => ({
      job_listing_id: listing.id,
      ...q,
    }));

    const { error: questionsError } = await supabaseAdmin
      .from("screening_questions")
      .insert(questionsToInsert);

    if (questionsError) {
      console.error("[api/employer/listings] Questions insert error:", questionsError.message);
      // Listing was created — don't fail the whole request, just log
    }
  }

  return NextResponse.json({
    ok: true,
    listing: {
      id: listing.id,
      slug: listing.slug,
      status: listing.status,
      mlm_flag_score: listing.mlm_flag_score,
    },
    screening_questions_count: validatedQuestions.length,
    ...(status === "review_pending"
      ? {
          notice:
            "Your listing has been flagged for review due to detected keywords. It will be reviewed before going live.",
        }
      : {}),
  });
});
