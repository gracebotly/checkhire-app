import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const POST = withApiHandler(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Not authenticated" },
      { status: 401 }
    );
  }

  if (user.email_confirmed_at) {
    return NextResponse.json(
      { ok: true, message: "Email already verified" }
    );
  }

  if (!user.email) {
    return NextResponse.json(
      { ok: false, message: "No email address on account" },
      { status: 400 }
    );
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
  });

  if (error) {
    console.error("[resend-confirmation] Error:", error.message);
    return NextResponse.json(
      { ok: false, message: "Failed to resend confirmation email. Please try again in a few minutes." },
      { status: 429 }
    );
  }

  return NextResponse.json({ ok: true });
});
