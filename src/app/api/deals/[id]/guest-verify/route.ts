import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { guestVerifySchema } from "@/lib/validation/disputes";
import { generateVerificationCode } from "@/lib/deals/verificationCode";
import { sendDealNotification } from "@/lib/email/notifications";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    // Only accept JSON
    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { ok: false, code: "INVALID_CONTENT_TYPE", message: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = guestVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, name } = parsed.data;
    const emailLower = email.toLowerCase();
    const supabase = createServiceClient();

    // Fetch deal
    const { data: deal } = await supabase
      .from("deals")
      .select("id, status, freelancer_user_id, guest_freelancer_email, client_user_id, title, deal_link_slug")
      .eq("id", id)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json({ ok: true, expires_in: 900 }); // Don't reveal deal existence
    }

    // Verify deal is pending acceptance with no freelancer
    if (deal.status !== "pending_acceptance" || deal.freelancer_user_id || deal.guest_freelancer_email) {
      return NextResponse.json({ ok: true, expires_in: 900 }); // Don't reveal state
    }

    // Verify email doesn't match client's email
    const { data: clientProfile } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("id", deal.client_user_id)
      .maybeSingle();

    if (clientProfile?.email?.toLowerCase() === emailLower) {
      return NextResponse.json({ ok: true, expires_in: 900 }); // Don't reveal
    }

    // Rate limit: per email per deal per hour
    const emailLimit = await checkRateLimit(`guest-verify:${id}:${emailLower}`, 3600, 3);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { ok: false, code: "RATE_LIMITED", message: "Too many requests. Try again in a few minutes." },
        { status: 429 }
      );
    }

    // Rate limit: per IP per hour
    const ip = getClientIp(req);
    const ipLimit = await checkRateLimit(`guest-verify-ip:${ip}`, 3600, 10);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { ok: false, code: "RATE_LIMITED", message: "Too many requests. Try again in a few minutes." },
        { status: 429 }
      );
    }

    // Generate code
    const { code, hash } = generateVerificationCode();

    // Insert verification record
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await supabase.from("guest_email_verifications").insert({
      deal_id: id,
      email: emailLower,
      code_hash: hash,
      expires_at: expiresAt,
    });

    // Send email (fire and forget — always return success)
    await sendDealNotification({
      type: "guest_verification_code",
      to: emailLower,
      data: {
        dealTitle: deal.title,
        dealSlug: deal.deal_link_slug,
        code,
      },
    });

    return NextResponse.json({ ok: true, expires_in: 900 });
  }
);
