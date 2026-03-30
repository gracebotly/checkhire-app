import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(
  async (
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
  ) => {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select(
        "id, display_name, avatar_url, bio, trust_badge, completed_deals_count, average_rating, profile_slug, created_at"
      )
      .eq("profile_slug", slug)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: error.message },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "User not found" },
        { status: 404 }
      );
    }

    // Ratings (public read RLS)
    const { data: ratings } = await supabase
      .from("ratings")
      .select(
        "*, rater:user_profiles!ratings_rater_user_id_fkey(display_name, avatar_url, profile_slug)"
      )
      .eq("rated_user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Recent completed deals (use service client to bypass participant RLS)
    const serviceClient = createServiceClient();
    const { data: deals } = await serviceClient
      .from("deals")
      .select(
        "id, title, total_amount, completed_at, deal_link_slug, client_user_id, freelancer_user_id, client:user_profiles!deals_client_user_id_fkey(display_name), freelancer:user_profiles!deals_freelancer_user_id_fkey(display_name)"
      )
      .or(`client_user_id.eq.${profile.id},freelancer_user_id.eq.${profile.id}`)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(10);

    const recentDeals = (deals || []).map((d) => {
      const isClient = d.client_user_id === profile.id;
      const otherParty = isClient
        ? (d.freelancer as unknown as { display_name: string | null })?.display_name
        : (d.client as unknown as { display_name: string | null })?.display_name;
      return {
        title: d.title,
        total_amount: d.total_amount,
        completed_at: d.completed_at,
        deal_link_slug: d.deal_link_slug,
        otherPartyName: otherParty || "Unknown",
        roleLabel: isClient ? "client" : "freelancer",
      };
    });

    return NextResponse.json({
      ok: true,
      user: profile,
      ratings: ratings || [],
      recent_deals: recentDeals,
    });
  }
);
