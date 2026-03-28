import { withApiHandler } from "@/lib/api/withApiHandler";
import { assignPseudonym } from "@/lib/seeker/assignPseudonym";
import { createClient } from "@/lib/supabase/server";
import { createApplicationSchema } from "@/lib/validation/applicationSchema";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const POST = withApiHandler(async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated." },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.user_type !== "job_seeker") {
    return NextResponse.json(
      {
        ok: false,
        code: "NOT_SEEKER",
        message: "Only job seekers can apply to listings.",
      },
      { status: 403 }
    );
  }

  const rawBody = await req.json().catch(() => ({}));
  const parsed = createApplicationSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message || "Invalid application payload.",
      },
      { status: 400 }
    );
  }

  const { job_listing_id, screening_responses } = parsed.data;

  const { data: listing } = await supabaseAdmin
    .from("job_listings")
    .select(
      "id, status, current_application_count, max_applications, requires_screening_quiz"
    )
    .eq("id", job_listing_id)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json(
      { ok: false, code: "LISTING_NOT_FOUND", message: "Listing not found." },
      { status: 404 }
    );
  }

  if (listing.status !== "active") {
    return NextResponse.json(
      {
        ok: false,
        code: "LISTING_NOT_ACTIVE",
        message: "This listing is no longer accepting applications.",
      },
      { status: 400 }
    );
  }

  if (listing.current_application_count >= listing.max_applications) {
    return NextResponse.json(
      {
        ok: false,
        code: "CAP_REACHED",
        message: "This listing has reached its application limit.",
      },
      { status: 400 }
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("applications")
    .select("id")
    .eq("job_listing_id", job_listing_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        ok: false,
        code: "ALREADY_APPLIED",
        message: "You have already applied to this listing.",
      },
      { status: 409 }
    );
  }

  if (listing.requires_screening_quiz) {
    const { data: questions } = await supabaseAdmin
      .from("screening_questions")
      .select("id, question_text, question_type, required")
      .eq("job_listing_id", job_listing_id)
      .order("sort_order", { ascending: true });

    if (questions && questions.length > 0) {
      const responses = screening_responses || {};

      for (const q of questions) {
        if (q.required) {
          const answer = responses[q.id];
          if (answer === undefined || answer === null || answer === "") {
            return NextResponse.json(
              {
                ok: false,
                code: "MISSING_RESPONSE",
                message: `Please answer the required question: "${q.question_text.substring(
                  0,
                  60
                )}..."`,
              },
              { status: 400 }
            );
          }
        }
      }
    }
  }

  const pseudonym = await assignPseudonym(job_listing_id);

  const { data: canIncrement, error: rpcError } = await supabaseAdmin.rpc(
    "increment_application_count",
    { p_listing_id: job_listing_id }
  );

  if (rpcError || canIncrement === false) {
    return NextResponse.json(
      {
        ok: false,
        code: "CAP_REACHED",
        message: "This listing has reached its application limit.",
      },
      { status: 400 }
    );
  }

  const { data: application, error: insertError } = await supabaseAdmin
    .from("applications")
    .insert({
      job_listing_id,
      user_id: user.id,
      pseudonym,
      disclosure_level: 1,
      status: "applied",
      screening_responses: screening_responses || null,
    })
    .select("id, pseudonym, status, created_at")
    .single();

  if (insertError) {
    console.error("[api/applications] Insert error:", insertError.message);
    return NextResponse.json(
      {
        ok: false,
        code: "INSERT_FAILED",
        message: "Failed to submit application.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    application: {
      id: application.id,
      pseudonym: application.pseudonym,
      status: application.status,
      created_at: application.created_at,
    },
  });
});
