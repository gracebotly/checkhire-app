import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { sendAndLogNotification } from "@/lib/email/logNotification";

export const runtime = "nodejs";

const EMAIL_RE =
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;

export const POST = withApiHandler(async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Not authenticated" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));

  // Optional override: client can supply a different email at send time
  // (e.g., they didn't enter one at creation, or they want to change it
  // before sending). Falls back to the stored recipient_email.
  const overrideEmail =
    typeof body.recipient_email === "string" ? body.recipient_email.trim() : "";
  const overrideName =
    typeof body.recipient_name === "string" ? body.recipient_name.trim() : "";

  // Load the deal — must be owned by the calling client
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select(
      "id, title, deal_link_slug, total_amount, deal_type, status, escrow_status, client_user_id, freelancer_user_id, guest_freelancer_email, recipient_email, recipient_name, recipient_invited_at"
    )
    .eq("id", dealId)
    .maybeSingle();

  if (dealError || !deal) {
    return NextResponse.json(
      { ok: false, message: "Deal not found" },
      { status: 404 }
    );
  }

  if (deal.client_user_id !== user.id) {
    return NextResponse.json(
      { ok: false, message: "Only the deal owner can send invites" },
      { status: 403 }
    );
  }

  if (deal.deal_type !== "private") {
    return NextResponse.json(
      { ok: false, message: "Invites are only available for private gigs" },
      { status: 400 }
    );
  }

  // Don't fire invites once a freelancer is already attached
  if (deal.freelancer_user_id || deal.guest_freelancer_email) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "This gig already has a freelancer attached — no invite needed.",
      },
      { status: 400 }
    );
  }

  // Don't fire invites on terminal-state deals
  const sendableStatuses = ["pending_acceptance", "funded"];
  if (!sendableStatuses.includes(deal.status)) {
    return NextResponse.json(
      {
        ok: false,
        message: `Cannot send invite — gig is ${deal.status}`,
      },
      { status: 400 }
    );
  }

  // Resolve final recipient email + name (override wins, falls back to stored)
  const finalEmail = (overrideEmail || deal.recipient_email || "").toLowerCase();
  const finalName = overrideName || deal.recipient_name || "";

  if (!finalEmail || !EMAIL_RE.test(finalEmail)) {
    return NextResponse.json(
      { ok: false, message: "A valid recipient email is required" },
      { status: 400 }
    );
  }

  // Pick the right template based on the LIVE escrow status
  const escrowFunded = deal.escrow_status === "funded";
  const templateType = escrowFunded
    ? "guest_deal_invite"
    : "guest_deal_invite_unfunded";

  const serviceClient = createServiceClient();

  try {
    await sendAndLogNotification({
      supabase: serviceClient,
      type: templateType,
      userId: user.id,
      dealId: deal.id,
      email: finalEmail,
      data: {
        dealTitle: deal.title,
        dealSlug: deal.deal_link_slug,
        amount: deal.total_amount,
      },
    });
  } catch (err) {
    console.error("[send-invite] Email send failed:", err);
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to send invite email. Please try again.",
      },
      { status: 502 }
    );
  }

  // Persist recipient + invited timestamp.
  // If the override email differs from what was stored, update both fields.
  const nowIso = new Date().toISOString();
  await serviceClient
    .from("deals")
    .update({
      recipient_email: finalEmail,
      recipient_name: finalName || null,
      recipient_invited_at: nowIso,
    })
    .eq("id", deal.id);

  // Activity log entry — visible to both parties later
  await serviceClient.from("deal_activity_log").insert({
    deal_id: deal.id,
    user_id: user.id,
    entry_type: "system",
    content: `Invite sent to ${finalName ? `${finalName} ` : ""}(${finalEmail}) — escrow ${escrowFunded ? "funded" : "not yet funded"}`,
  });

  return NextResponse.json({
    ok: true,
    invited_at: nowIso,
    recipient_email: finalEmail,
    recipient_name: finalName || null,
    template: templateType,
  });
});
