import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(
  async (
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
  ) => {
    const { slug } = await params;
    const supabase = await createClient();

    // Fetch deal with participants
    const { data: deal, error } = await supabase
      .from("deals")
      .select(
        `*, client:user_profiles!deals_client_user_id_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug), freelancer:user_profiles!deals_freelancer_user_id_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug, stripe_onboarding_complete)`
      )
      .eq("deal_link_slug", slug)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: error.message },
        { status: 500 }
      );
    }

    if (!deal) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    // Determine viewer role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let role: "client" | "freelancer" | "visitor" = "visitor";
    if (user) {
      if (deal.client_user_id === user.id) role = "client";
      else if (deal.freelancer_user_id === user.id) role = "freelancer";
    }

    let milestones = null;
    let activity = null;

    if (role !== "visitor") {
      // Fetch milestones
      const { data: ms } = await supabase
        .from("milestones")
        .select("*")
        .eq("deal_id", deal.id)
        .order("position", { ascending: true });
      milestones = ms || [];

      // Fetch activity log
      const { data: acts } = await supabase
        .from("deal_activity_log")
        .select(
          `*, user:user_profiles!deal_activity_log_user_id_fkey(display_name, avatar_url)`
        )
        .eq("deal_id", deal.id)
        .order("created_at", { ascending: true });
      activity = acts || [];

      if (activity.length > 0) {
        const fileEntries = activity.filter(
          (entry) => entry.entry_type === "file" && entry.file_url
        );

        for (const entry of fileEntries) {
          const { data: signed } = await supabase.storage
            .from("deal-files")
            .createSignedUrl(entry.file_url as string, 60 * 15);

          if (signed?.signedUrl) {
            entry.file_url = signed.signedUrl;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      deal,
      milestones,
      activity,
      role,
    });
  }
);
