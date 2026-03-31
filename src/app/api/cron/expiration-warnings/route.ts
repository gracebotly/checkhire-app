import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendAndLogNotification } from "@/lib/email/logNotification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  let warningsSent = 0;

  try {
    const now = new Date();

    // ── 1. 14-day warning for funded deals with no freelancer ──
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();

    const { data: deals14d } = await supabase
      .from("deals")
      .select("id, title, deal_link_slug, client_user_id, total_amount, funded_at")
      .eq("escrow_status", "funded")
      .is("freelancer_user_id", null)
      .is("guest_freelancer_email", null)
      .lte("funded_at", fourteenDaysAgo)
      .gte("funded_at", fifteenDaysAgo);

    for (const deal of deals14d || []) {
      const { data: clientProfile } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("id", deal.client_user_id)
        .maybeSingle();

      if (clientProfile?.email) {
        // Idempotency: check if already sent
        const { data: existing } = await supabase
          .from("email_notifications")
          .select("id")
          .eq("deal_id", deal.id)
          .eq("notification_type", "auto_expire_warning_14d")
          .maybeSingle();

        if (!existing) {
          await sendAndLogNotification({
            supabase,
            type: "auto_expire_warning_14d",
            userId: deal.client_user_id,
            dealId: deal.id,
            email: clientProfile.email,
            data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, amount: deal.total_amount },
          });
          warningsSent++;
        }
      }
    }

    // ── 2. 27-day final warning ──
    const twentySevenDaysAgo = new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000).toISOString();
    const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();

    const { data: deals27d } = await supabase
      .from("deals")
      .select("id, title, deal_link_slug, client_user_id, total_amount, funded_at")
      .eq("escrow_status", "funded")
      .is("freelancer_user_id", null)
      .is("guest_freelancer_email", null)
      .lte("funded_at", twentySevenDaysAgo)
      .gte("funded_at", twentyEightDaysAgo);

    for (const deal of deals27d || []) {
      const { data: clientProfile } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("id", deal.client_user_id)
        .maybeSingle();

      if (clientProfile?.email) {
        const { data: existing } = await supabase
          .from("email_notifications")
          .select("id")
          .eq("deal_id", deal.id)
          .eq("notification_type", "auto_expire_warning_27d")
          .maybeSingle();

        if (!existing) {
          await sendAndLogNotification({
            supabase,
            type: "auto_expire_warning_27d",
            userId: deal.client_user_id,
            dealId: deal.id,
            email: clientProfile.email,
            data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, amount: deal.total_amount },
          });
          warningsSent++;
        }
      }
    }

    // ── 3. 7-day nudge for ghosting freelancers ──
    // Deals with a freelancer, funded, zero evidence, accepted 7+ days ago
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();

    const { data: ghostDeals7d } = await supabase
      .from("deals")
      .select("id, title, deal_link_slug, freelancer_user_id, guest_freelancer_email, guest_freelancer_name, updated_at")
      .eq("escrow_status", "funded")
      .not("freelancer_user_id", "is", null)
      .lte("updated_at", sevenDaysAgo)
      .gte("updated_at", eightDaysAgo);

    // Also check deals with guest freelancers
    const { data: ghostGuestDeals7d } = await supabase
      .from("deals")
      .select("id, title, deal_link_slug, freelancer_user_id, guest_freelancer_email, guest_freelancer_name, guest_email_verified_at")
      .eq("escrow_status", "funded")
      .is("freelancer_user_id", null)
      .not("guest_freelancer_email", "is", null)
      .lte("guest_email_verified_at", sevenDaysAgo)
      .gte("guest_email_verified_at", eightDaysAgo);

    const allGhostDeals7d = [...(ghostDeals7d || []), ...(ghostGuestDeals7d || [])];

    for (const deal of allGhostDeals7d) {
      // Check zero evidence
      const { data: evidence } = await supabase
        .from("deal_activity_log")
        .select("id")
        .eq("deal_id", deal.id)
        .eq("is_submission_evidence", true)
        .limit(1);

      if (evidence && evidence.length > 0) continue;

      // Idempotency
      const { data: existing } = await supabase
        .from("email_notifications")
        .select("id")
        .eq("deal_id", deal.id)
        .eq("notification_type", "freelancer_ghost_nudge_7d")
        .maybeSingle();

      if (existing) continue;

      if (deal.freelancer_user_id) {
        const { data: fp } = await supabase.from("user_profiles").select("email").eq("id", deal.freelancer_user_id).maybeSingle();
        if (fp?.email) {
          await sendAndLogNotification({
            supabase,
            type: "freelancer_ghost_nudge_7d",
            userId: deal.freelancer_user_id,
            dealId: deal.id,
            email: fp.email,
            data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug },
          });
          warningsSent++;
        }
      } else if (deal.guest_freelancer_email) {
        await sendAndLogNotification({
          supabase,
          type: "freelancer_ghost_nudge_7d",
          userId: "guest",
          dealId: deal.id,
          email: deal.guest_freelancer_email,
          data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug },
        });
        warningsSent++;
      }
    }

    // ── 4. 14-day warning to client about ghost freelancer ──
    const fourteenDaysAgoForGhost = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const fifteenDaysAgoForGhost = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();

    const { data: ghostDeals14d } = await supabase
      .from("deals")
      .select("id, title, deal_link_slug, client_user_id, freelancer_user_id, guest_freelancer_email, updated_at")
      .eq("escrow_status", "funded")
      .not("freelancer_user_id", "is", null)
      .lte("updated_at", fourteenDaysAgoForGhost)
      .gte("updated_at", fifteenDaysAgoForGhost);

    const { data: ghostGuestDeals14d } = await supabase
      .from("deals")
      .select("id, title, deal_link_slug, client_user_id, freelancer_user_id, guest_freelancer_email, guest_email_verified_at")
      .eq("escrow_status", "funded")
      .is("freelancer_user_id", null)
      .not("guest_freelancer_email", "is", null)
      .lte("guest_email_verified_at", fourteenDaysAgoForGhost)
      .gte("guest_email_verified_at", fifteenDaysAgoForGhost);

    const allGhostDeals14d = [...(ghostDeals14d || []), ...(ghostGuestDeals14d || [])];

    for (const deal of allGhostDeals14d) {
      const { data: evidence } = await supabase
        .from("deal_activity_log")
        .select("id")
        .eq("deal_id", deal.id)
        .eq("is_submission_evidence", true)
        .limit(1);

      if (evidence && evidence.length > 0) continue;

      const { data: existing } = await supabase
        .from("email_notifications")
        .select("id")
        .eq("deal_id", deal.id)
        .eq("notification_type", "freelancer_ghost_warning_14d")
        .maybeSingle();

      if (existing) continue;

      const { data: clientProfile } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("id", deal.client_user_id)
        .maybeSingle();

      if (clientProfile?.email) {
        await sendAndLogNotification({
          supabase,
          type: "freelancer_ghost_warning_14d",
          userId: deal.client_user_id,
          dealId: deal.id,
          email: clientProfile.email,
          data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug },
        });
        warningsSent++;
      }
    }
  } catch (err) {
    console.error("[expiration-warnings] Cron error:", err);
    return NextResponse.json({ ok: false, error: "Cron execution error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, warnings_sent: warningsSent });
}
