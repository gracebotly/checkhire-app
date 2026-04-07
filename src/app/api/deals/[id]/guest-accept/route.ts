import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { guestAcceptSchema } from "@/lib/validation/disputes";
import { hashVerificationCode } from "@/lib/deals/verificationCode";
import { generateGuestToken } from "@/lib/deals/guestToken";
import { sendAndLogNotification } from "@/lib/email/logNotification";
import { setGuestSessionCookie } from "@/lib/deals/guestSession";

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
    const parsed = guestAcceptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, name, code } = parsed.data;
    const emailLower = email.toLowerCase();
    const supabase = createServiceClient();

    // Fetch deal
    const { data: deal } = await supabase
      .from("deals")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Deal not found" }, { status: 404 });
    }

    // Verify deal is pending acceptance with no freelancer
    if (deal.status !== "pending_acceptance" || deal.freelancer_user_id || deal.guest_freelancer_email) {
      return NextResponse.json(
        { ok: false, code: "INVALID_STATUS", message: "This gig cannot be accepted" },
        { status: 400 }
      );
    }

    // Verify email doesn't match client's email
    const { data: clientProfile } = await supabase
      .from("user_profiles")
      .select("email, display_name")
      .eq("id", deal.client_user_id)
      .maybeSingle();

    if (clientProfile?.email?.toLowerCase() === emailLower) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "You cannot accept your own gig" },
        { status: 403 }
      );
    }

    // Verify code — get most recent unverified verification record
    const { data: verification } = await supabase
      .from("guest_email_verifications")
      .select("*")
      .eq("deal_id", id)
      .eq("email", emailLower)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!verification) {
      return NextResponse.json(
        { ok: false, code: "INVALID_CODE", message: "Invalid or expired code. Request a new one." },
        { status: 400 }
      );
    }

    // Check attempts
    if (verification.attempts >= 5) {
      return NextResponse.json(
        { ok: false, code: "TOO_MANY_ATTEMPTS", message: "Too many attempts. Request a new code." },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.json(
        { ok: false, code: "INVALID_CODE", message: "Invalid or expired code. Request a new one." },
        { status: 400 }
      );
    }

    // Hash and compare
    const codeHash = hashVerificationCode(code);
    if (codeHash !== verification.code_hash) {
      // Increment attempts
      await supabase
        .from("guest_email_verifications")
        .update({ attempts: verification.attempts + 1 })
        .eq("id", verification.id);

      return NextResponse.json(
        { ok: false, code: "INVALID_CODE", message: "Incorrect code. Please try again." },
        { status: 400 }
      );
    }

    // Mark verified
    await supabase
      .from("guest_email_verifications")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", verification.id);

    // Determine the right status after acceptance
    const newStatus = deal.escrow_status === "funded" ? "in_progress" : "pending_acceptance";
    const acceptedStatus = deal.escrow_status === "funded" ? "in_progress" : "funded";
    // If escrow is already funded, go straight to in_progress
    // If not funded yet, stay in a state that indicates freelancer accepted but needs funding
    const dealStatus = deal.escrow_status === "funded" ? "in_progress" : "pending_acceptance";

    // Update deal with guest freelancer info
    await supabase
      .from("deals")
      .update({
        guest_freelancer_email: emailLower,
        guest_freelancer_name: name,
        guest_email_verified_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
        status: deal.escrow_status === "funded" ? "in_progress" : deal.status,
      })
      .eq("id", id);

    // Generate guest token
    const guestToken = generateGuestToken(id, emailLower);

    // Activity log
    await supabase.from("deal_activity_log").insert({
      deal_id: id,
      user_id: null,
      entry_type: "system",
      content: `${name} accepted the gig`,
    });

    // Email to client
    if (clientProfile?.email) {
      await sendAndLogNotification({
        supabase,
        type: "deal_accepted",
        userId: deal.client_user_id,
        dealId: id,
        email: clientProfile.email,
        data: {
          dealTitle: deal.title,
          dealSlug: deal.deal_link_slug,
          otherPartyName: name,
        },
      });
    }

    // Email to freelancer based on escrow status
    if (deal.escrow_status === "funded") {
      await sendAndLogNotification({
        supabase,
        type: "escrow_funded_after_accept",
        userId: null,
        dealId: id,
        email: emailLower,
        data: {
          dealTitle: deal.title,
          dealSlug: deal.deal_link_slug,
          amount: deal.total_amount,
        },
      });
    } else {
      await sendAndLogNotification({
        supabase,
        type: "deal_accepted_escrow_pending",
        userId: null,
        dealId: id,
        email: emailLower,
        data: {
          dealTitle: deal.title,
          dealSlug: deal.deal_link_slug,
        },
      });
    }

    // Set httpOnly cookie so guest can return to the deal page without URL param
    await setGuestSessionCookie(id, guestToken);

    // Send welcome email with clear next steps — non-fatal on failure
    try {
      await sendAndLogNotification({
        supabase,
        type: "guest_accepted_welcome",
        userId: null,
        dealId: id,
        email: emailLower,
        data: {
          dealTitle: deal.title,
          dealSlug: deal.deal_link_slug,
          amount: deal.total_amount,
          guestName: name,
        },
      });
    } catch (err) {
      console.error("[guest-accept] Welcome email failed:", err);
    }

    return NextResponse.json({ ok: true, guest_token: guestToken });
  }
);
