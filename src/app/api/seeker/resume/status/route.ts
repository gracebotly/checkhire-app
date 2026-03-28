import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = withApiHandler(async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated." },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("seeker_profiles")
    .select("parse_status, parsed_summary")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { ok: false, code: "NO_PROFILE", message: "No seeker profile found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    parse_status: profile.parse_status,
    parsed_summary: profile.parsed_summary,
  });
});
