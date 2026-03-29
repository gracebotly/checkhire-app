import { withApiHandler } from "@/lib/api/withApiHandler";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employer/applications/[id]/masked-email
 */
export const GET = withApiHandler(async function GET(
  _req: Request,
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

  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, job_listing_id, disclosure_level")
    .eq("id", id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Application not found." },
      { status: 404 }
    );
  }

  const { data: listing } = await supabaseAdmin
    .from("job_listings")
    .select("id, employer_id")
    .eq("id", application.job_listing_id)
    .eq("employer_id", ctx.employerId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json(
      { ok: false, code: "NOT_AUTHORIZED", message: "Not your listing." },
      { status: 403 }
    );
  }

  if (application.disclosure_level < 2) {
    return NextResponse.json({ ok: true, applicant_masked_email: null });
  }

  const { data: pair } = await supabaseAdmin
    .from("masked_email_pairs")
    .select("applicant_masked_email, employer_masked_email, status")
    .eq("application_id", id)
    .eq("status", "active")
    .maybeSingle();

  if (!pair) {
    return NextResponse.json({ ok: true, applicant_masked_email: null });
  }

  return NextResponse.json({
    ok: true,
    applicant_masked_email: pair.applicant_masked_email,
    employer_masked_email: pair.employer_masked_email,
  });
});
