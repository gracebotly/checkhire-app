import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(async (req: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
      { status: 401 }
    );

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "active";
  const role = url.searchParams.get("role"); // 'client' | 'freelancer' | null (all)

  let query = supabase
    .from("deals")
    .select(
      `*, client:user_profiles!deals_client_user_id_profile_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug), freelancer:user_profiles!deals_freelancer_user_id_profile_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug)`
    );

  // Role-based filtering
  if (role === "client") {
    query = query.eq("client_user_id", user.id);
  } else if (role === "freelancer") {
    query = query.eq("freelancer_user_id", user.id);
  } else {
    query = query.or(`client_user_id.eq.${user.id},freelancer_user_id.eq.${user.id}`);
  }

  if (filter === "active") {
    query = query.not(
      "status",
      "in",
      "(completed,cancelled,refunded)"
    );
  } else if (filter === "completed") {
    query = query.eq("status", "completed");
  }

  const { data: deals, error } = await query.order("updated_at", {
    ascending: false,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, code: "DB_ERROR", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, deals: deals || [] });
});
