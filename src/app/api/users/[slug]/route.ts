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

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select(
        "display_name, avatar_url, bio, trust_badge, completed_deals_count, average_rating, profile_slug, created_at"
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

    return NextResponse.json({ ok: true, user: profile });
  }
);
