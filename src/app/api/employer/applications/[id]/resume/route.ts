import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { logCandidateAccess } from "@/lib/api/auditLog";
import { checkCandidateViewRateLimit } from "@/lib/api/rateLimitCandidateViews";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SIGNED_URL_EXPIRY_SECONDS = 900; // 15 minutes

/**
 * GET /api/employer/applications/[id]/resume
 *
 * Returns a signed, 15-minute expiring URL for the candidate's resume PDF.
 * ONLY available when disclosure_level === 3.
 * Rate limited and audit logged.
 */
export const GET = withApiHandler(async function GET(
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

  // Rate limit check
  const rl = await checkCandidateViewRateLimit(ctx.employerId, req);
  if (!rl.allowed) return rl.response;

  // Fetch the application
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, user_id, job_listing_id, disclosure_level")
    .eq("id", id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Application not found." },
      { status: 404 }
    );
  }

  // Verify the listing belongs to this employer
  const { data: listing } = await supabaseAdmin
    .from("job_listings")
    .select("id, employer_id")
    .eq("id", application.job_listing_id)
    .eq("employer_id", ctx.employerId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json(
      { ok: false, code: "NOT_AUTHORIZED", message: "This application is not on your listing." },
      { status: 403 }
    );
  }

  // Enforce disclosure level 3
  if (application.disclosure_level < 3) {
    return NextResponse.json(
      {
        ok: false,
        code: "DISCLOSURE_INSUFFICIENT",
        message: "Resume access requires Stage 3 disclosure. The candidate must advance through the interview process first.",
      },
      { status: 403 }
    );
  }

  // Fetch the resume file path from seeker_profiles
  const { data: seekerProfile } = await supabaseAdmin
    .from("seeker_profiles")
    .select("resume_file_url")
    .eq("id", application.user_id)
    .maybeSingle();

  if (!seekerProfile?.resume_file_url) {
    return NextResponse.json(
      { ok: false, code: "NO_RESUME", message: "This candidate has not uploaded a resume." },
      { status: 404 }
    );
  }

  // Generate signed URL (15 minutes)
  const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
    .from("resumes")
    .createSignedUrl(seekerProfile.resume_file_url, SIGNED_URL_EXPIRY_SECONDS);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error("[resume] Signed URL error:", signedUrlError?.message);
    return NextResponse.json(
      { ok: false, code: "URL_GENERATION_FAILED", message: "Failed to generate resume access URL." },
      { status: 500 }
    );
  }

  // Log access
  await logCandidateAccess(
    ctx.employerId,
    ctx.userId,
    "resume_access",
    application.id,
    application.disclosure_level,
    req
  );

  const response = NextResponse.json({
    ok: true,
    resume_url: signedUrlData.signedUrl,
    expires_in_seconds: SIGNED_URL_EXPIRY_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
});
