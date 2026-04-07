import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { z } from "zod";

const bodySchema = z
  .object({
    email: z.string().email().optional(),
  })
  .optional();

export const POST = withApiHandler(async (req: Request) => {
  const supabase = await createClient();

  // Parse optional body (email fallback for unauthenticated users)
  let bodyEmail: string | undefined;
  try {
    const raw = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (parsed.success && parsed.data?.email) {
      bodyEmail = parsed.data.email.trim().toLowerCase();
    }
  } catch {
    // No body or invalid JSON — fine, fall through to session check
  }

  // Path A: authenticated user (existing behavior)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (user.email_confirmed_at) {
      return NextResponse.json({
        ok: true,
        message: "Email already verified",
      });
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
      console.error("[resend-confirmation] Authed resend error:", error.message);
      return NextResponse.json(
        {
          ok: false,
          message:
            "Failed to resend confirmation email. Please try again in a few minutes.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json({ ok: true });
  }

  // Path B: unauthenticated — require email in body
  if (!bodyEmail) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Email is required to resend the confirmation link.",
      },
      { status: 400 }
    );
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: bodyEmail,
  });

  if (error) {
    console.error("[resend-confirmation] Unauthed resend error:", error.message);
    // Do NOT leak whether the email exists. Always return a generic failure
    // but still use 429 so the client UI shows "try again later" cleanly.
    return NextResponse.json(
      {
        ok: false,
        message:
          "Failed to resend confirmation email. Please try again in a few minutes.",
      },
      { status: 429 }
    );
  }

  return NextResponse.json({ ok: true });
});
