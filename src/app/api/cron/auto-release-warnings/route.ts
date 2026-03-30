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
  const now = new Date();

  try {
    // 24-hour warnings: auto_release_at between 23h and 25h from now
    const warn24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
    const warn24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

    const { data: deals24h } = await supabase
      .from("deals")
      .select("id, title, deal_link_slug, total_amount, client_user_id")
      .eq("status", "submitted")
      .gte("auto_release_at", warn24hStart)
      .lte("auto_release_at", warn24hEnd);

    for (const deal of deals24h || []) {
      // Check if we already sent a 24h warning for this deal
      const { data: existing } = await supabase
        .from("email_notifications")
        .select("id")
        .eq("deal_id", deal.id)
        .eq("notification_type", "auto_release_warning_24h")
        .maybeSingle();

      if (existing) continue; // Already sent

      const { data: client } = await supabase.from("user_profiles").select("email").eq("id", deal.client_user_id).maybeSingle();
      if (client?.email) {
        await sendAndLogNotification({
          supabase,
          type: "auto_release_warning_24h",
          userId: deal.client_user_id,
          dealId: deal.id,
          email: client.email,
          data: {
            dealTitle: deal.title,
            dealSlug: deal.deal_link_slug,
            amount: deal.total_amount,
          },
        });
        warningsSent++;
      }
    }

    // 6-hour warnings: auto_release_at between 5h and 7h from now
    const warn6hStart = new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString();
    const warn6hEnd = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString();

    const { data: deals6h } = await supabase
      .from("deals")
      .select("id, title, deal_link_slug, total_amount, client_user_id")
      .eq("status", "submitted")
      .gte("auto_release_at", warn6hStart)
      .lte("auto_release_at", warn6hEnd);

    for (const deal of deals6h || []) {
      const { data: existing } = await supabase
        .from("email_notifications")
        .select("id")
        .eq("deal_id", deal.id)
        .eq("notification_type", "auto_release_warning_6h")
        .maybeSingle();

      if (existing) continue;

      const { data: client } = await supabase.from("user_profiles").select("email").eq("id", deal.client_user_id).maybeSingle();
      if (client?.email) {
        await sendAndLogNotification({
          supabase,
          type: "auto_release_warning_6h",
          userId: deal.client_user_id,
          dealId: deal.id,
          email: client.email,
          data: {
            dealTitle: deal.title,
            dealSlug: deal.deal_link_slug,
            amount: deal.total_amount,
          },
        });
        warningsSent++;
      }
    }

    // Same logic for milestones
    // 24h milestone warnings
    const { data: ms24h } = await supabase
      .from("milestones")
      .select("id, title, amount, deal_id, deal:deals!inner(title, deal_link_slug, client_user_id)")
      .eq("status", "submitted")
      .gte("auto_release_at", warn24hStart)
      .lte("auto_release_at", warn24hEnd);

    for (const ms of ms24h || []) {
      const deal = ms.deal as unknown as { title: string; deal_link_slug: string; client_user_id: string };
      const { data: existing } = await supabase.from("email_notifications").select("id").eq("deal_id", ms.deal_id).eq("notification_type", "auto_release_warning_24h").maybeSingle();
      if (existing) continue;

      const { data: client } = await supabase.from("user_profiles").select("email").eq("id", deal.client_user_id).maybeSingle();
      if (client?.email) {
        await sendAndLogNotification({
          supabase,
          type: "auto_release_warning_24h",
          userId: deal.client_user_id,
          dealId: ms.deal_id,
          email: client.email,
          data: {
            dealTitle: `${deal.title} — ${ms.title}`,
            dealSlug: deal.deal_link_slug,
            amount: ms.amount,
          },
        });
        warningsSent++;
      }
    }

    // 6h milestone warnings
    const { data: ms6h } = await supabase
      .from("milestones")
      .select("id, title, amount, deal_id, deal:deals!inner(title, deal_link_slug, client_user_id)")
      .eq("status", "submitted")
      .gte("auto_release_at", warn6hStart)
      .lte("auto_release_at", warn6hEnd);

    for (const ms of ms6h || []) {
      const deal = ms.deal as unknown as { title: string; deal_link_slug: string; client_user_id: string };
      const { data: existing } = await supabase.from("email_notifications").select("id").eq("deal_id", ms.deal_id).eq("notification_type", "auto_release_warning_6h").maybeSingle();
      if (existing) continue;

      const { data: client } = await supabase.from("user_profiles").select("email").eq("id", deal.client_user_id).maybeSingle();
      if (client?.email) {
        await sendAndLogNotification({
          supabase,
          type: "auto_release_warning_6h",
          userId: deal.client_user_id,
          dealId: ms.deal_id,
          email: client.email,
          data: {
            dealTitle: `${deal.title} — ${ms.title}`,
            dealSlug: deal.deal_link_slug,
            amount: ms.amount,
          },
        });
        warningsSent++;
      }
    }
  } catch (err) {
    console.error("[auto-release-warnings] Cron error:", err);
    return NextResponse.json({ ok: false, error: "Cron execution error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, warnings_sent: warningsSent });
}
