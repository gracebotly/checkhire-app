import { NextResponse } from "next/server";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import crypto from "crypto";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/employer/verify-email/confirm
 *
 * Accepts { code } in the body.
 * Validates the code against stored hash, marks it used,
 * and sets employers.domain_email_verified_at.
 */
export const POST = withApiHandler(async function POST(req: Request) {
  const ctx = await getEmployerForUser();

  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  // Rate limit: 10 attempts per hour per employer
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`verify-email-confirm:${ctx.employerId}:${ip}`, 3600, 10);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: "Too many verification attempts. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const code = (body?.code ?? "").toString().trim();

  if (!code || code.length !== 6) {
    return NextResponse.json(
      { ok: false, code: "INVALID_CODE", message: "Please enter the 6-digit code." },
      { status: 400 }
    );
  }

  // Hash the submitted code
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  // Find matching unused code for this employer
  const { data: verificationCode } = await supabaseAdmin
    .from("verification_codes")
    .select("id, email, expires_at")
    .eq("employer_id", ctx.employerId)
    .eq("code_hash", codeHash)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!verificationCode) {
    return NextResponse.json(
      { ok: false, code: "WRONG_CODE", message: "Invalid or expired code. Please request a new one." },
      { status: 400 }
    );
  }

  // Check expiry
  if (new Date(verificationCode.expires_at) < new Date()) {
    return NextResponse.json(
      { ok: false, code: "CODE_EXPIRED", message: "This code has expired. Please request a new one." },
      { status: 400 }
    );
  }

  // Mark code as used
  await supabaseAdmin
    .from("verification_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", verificationCode.id);

  // Set domain_email_verified_at on the employer record
  const { error: updateError } = await supabaseAdmin
    .from("employers")
    .update({ domain_email_verified_at: new Date().toISOString() })
    .eq("id", ctx.employerId);

  if (updateError) {
    console.error("[verify-email/confirm] Update error:", updateError.message);
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Verification succeeded but failed to update your account. Please contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Domain email verified successfully.",
    verified_email: verificationCode.email,
  });
});
