import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { updateProfileSchema } from "@/lib/validation/deals";

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

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message || "Invalid input",
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Check slug uniqueness if provided
  if (data.profile_slug) {
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("profile_slug", data.profile_slug)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          code: "SLUG_TAKEN",
          message: "This profile URL is already taken",
        },
        { status: 409 }
      );
    }
  }

  const { data: updated, error } = await supabase
    .from("user_profiles")
    .update({
      ...(data.display_name !== undefined && {
        display_name: data.display_name,
      }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.profile_slug !== undefined && {
        profile_slug: data.profile_slug,
      }),
      ...(data.avatar_url !== undefined && { avatar_url: data.avatar_url }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, code: "DB_ERROR", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, user: updated });
});
