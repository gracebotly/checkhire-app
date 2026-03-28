import { NextResponse } from "next/server";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { Resend } from "resend";
import crypto from "crypto";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/employer/verify-email/send
 *
 * Accepts { email } in the body.
 * Validates the email domain matches the employer's website_domain.
 * Generates a 6-digit code, hashes it, stores in verification_codes,
 * and sends the code via Resend.
 */
export const POST = withApiHandler(async function POST(req: Request) {
  const ctx = await getEmployerForUser();

  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  // Rate limit: 5 sends per hour per employer
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`verify-email-send:${ctx.employerId}:${ip}`, 3600, 5);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: "Too many verification attempts. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = (body?.email ?? "").toString().trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, code: "INVALID_EMAIL", message: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  // Extract domain from email
  const emailDomain = email.split("@")[1];

  // Check employer has a website_domain set
  if (!ctx.employer.website_domain) {
    return NextResponse.json(
      {
        ok: false,
        code: "NO_DOMAIN",
        message: "Please set your company website domain in Settings → Company Profile before verifying.",
      },
      { status: 400 }
    );
  }

  // Validate email domain matches the employer's website domain
  const companyDomain = ctx.employer.website_domain.toLowerCase().replace(/^www\./, "");
  if (emailDomain !== companyDomain) {
    return NextResponse.json(
      {
        ok: false,
        code: "DOMAIN_MISMATCH",
        message: `Email must be from @${companyDomain}. You entered @${emailDomain}.`,
      },
      { status: 400 }
    );
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  // Expires in 15 minutes
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  // Invalidate any existing unused codes for this employer
  await supabaseAdmin
    .from("verification_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("employer_id", ctx.employerId)
    .is("used_at", null);

  // Store new code
  const { error: insertError } = await supabaseAdmin
    .from("verification_codes")
    .insert({
      employer_id: ctx.employerId,
      user_id: ctx.userId,
      email,
      code_hash: codeHash,
      expires_at: expiresAt.toISOString(),
    });

  if (insertError) {
    console.error("[verify-email/send] Insert error:", insertError.message);
    return NextResponse.json(
      { ok: false, code: "STORE_FAILED", message: "Failed to generate verification code." },
      { status: 500 }
    );
  }

  // Send email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[verify-email/send] RESEND_API_KEY not set — code is:", code);
    return NextResponse.json({
      ok: true,
      message: "Verification code generated (email delivery skipped — RESEND_API_KEY not configured).",
      expires_in_minutes: 15,
      // In development, return the code for testing. REMOVE IN PRODUCTION.
      ...(process.env.NODE_ENV === "development" ? { dev_code: code } : {}),
    });
  }

  const resend = new Resend(resendKey);

  try {
    await resend.emails.send({
      from: "CheckHire <verify@checkhire.com>",
      to: [email],
      subject: `${code} — CheckHire Domain Verification`,
      text: `Your CheckHire verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, you can safely ignore this email.\n\n— CheckHire`,
    });
  } catch (err) {
    console.error("[verify-email/send] Resend error:", err);
    return NextResponse.json(
      { ok: false, code: "EMAIL_FAILED", message: "Failed to send verification email. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Verification code sent to ${email}`,
    expires_in_minutes: 15,
  });
});
