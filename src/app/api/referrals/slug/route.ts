import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { referralSlugSchema } from "@/lib/validation/referrals";

export const PATCH = withApiHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = referralSlugSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const { slug } = parsed.data;

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("referral_slug", slug)
    .neq("id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "This slug is already taken. Try another one." },
      { status: 409 },
    );
  }

  const { error: updateError } = await supabase
    .from("user_profiles")
    .update({ referral_slug: slug })
    .eq("id", user.id);

  if (updateError) {
    console.error("[Referral] Failed to update slug:", updateError);
    return NextResponse.json({ error: "Failed to update slug" }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://checkhire.com";

  return NextResponse.json({
    referral_slug: slug,
    referral_link: `${baseUrl}/ref/${slug}`,
  });
});
