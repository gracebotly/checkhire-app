import { NextRequest, NextResponse } from "next/server";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employer/listings/[id] — Get a single listing (employer view).
 */
export const GET = withApiHandler(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getEmployerForUser();

  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  const { data: listing, error } = await supabaseAdmin
    .from("job_listings")
    .select("*")
    .eq("id", id)
    .eq("employer_id", ctx.employerId)
    .maybeSingle();

  if (error) {
    console.error("[api/employer/listings/id] Query error:", error.message);
    return NextResponse.json(
      { ok: false, code: "QUERY_FAILED", message: "Failed to fetch listing." },
      { status: 500 }
    );
  }

  if (!listing) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Listing not found." },
      { status: 404 }
    );
  }

  // Fetch screening questions
  const { data: questions } = await supabaseAdmin
    .from("screening_questions")
    .select("id, question_text, question_type, options, required, sort_order")
    .eq("job_listing_id", id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    ok: true,
    listing: { ...listing, screening_questions: questions || [] },
  });
});

/**
 * PATCH /api/employer/listings/[id] — Update listing or change status.
 *
 * Accepts { status: "paused" | "active" } to pause/unpause.
 * Cannot set status to "closed" or "filled" here — use the /close endpoint.
 */
export const PATCH = withApiHandler(async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getEmployerForUser();

  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from("job_listings")
    .select("id, status")
    .eq("id", id)
    .eq("employer_id", ctx.employerId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Listing not found." },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => ({}));

  // Handle status changes (pause/unpause only)
  if (body.status) {
    const newStatus = body.status;

    if (newStatus === "paused" && existing.status === "active") {
      const { error } = await supabaseAdmin
        .from("job_listings")
        .update({ status: "paused" })
        .eq("id", id)
        .eq("employer_id", ctx.employerId);

      if (error) {
        return NextResponse.json(
          { ok: false, code: "UPDATE_FAILED", message: "Failed to pause listing." },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, status: "paused" });
    }

    if (newStatus === "active" && existing.status === "paused") {
      const { error } = await supabaseAdmin
        .from("job_listings")
        .update({ status: "active" })
        .eq("id", id)
        .eq("employer_id", ctx.employerId);

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            code: "UPDATE_FAILED",
            message: "Failed to unpause listing.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, status: "active" });
    }

    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_STATUS_CHANGE",
        message: `Cannot change from ${existing.status} to ${newStatus}. Use the close endpoint to close or fill a listing.`,
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { ok: false, code: "NO_CHANGES", message: "No valid updates provided." },
    { status: 400 }
  );
});
