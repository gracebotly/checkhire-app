import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const PATCH = withApiHandler(async (req: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
      { status: 401 }
    );

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode;

  if (mode !== "client" && mode !== "freelancer") {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Mode must be 'client' or 'freelancer'" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ current_mode: mode })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { ok: false, code: "DB_ERROR", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, mode });
});

export const GET = withApiHandler(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
      { status: 401 }
    );

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("current_mode")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    mode: profile?.current_mode || null,
  });
});
