import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://checkhire.co";

export const POST = withApiHandler(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { ok: false, message: "Not authenticated or no email" },
      { status: 401 }
    );
  }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${APP_URL}/auth/confirm?type=recovery&next=/auth/reset-password`,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
});
