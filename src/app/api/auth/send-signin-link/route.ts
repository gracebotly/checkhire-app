import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const runtime = "nodejs";

const EMAIL_RE =
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;

const DOMAIN_TYPOS: Record<string, string> = {
  "gmal.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "iclod.com": "icloud.com",
  "icloud.co": "icloud.com",
};

function siteUrl(req: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.startsWith("http")) return env;
  return new URL(req.url).origin;
}

export const POST = withApiHandler(async function POST(req: Request) {
  const body: { email?: unknown } = await req.json().catch(() => ({}));
  const email = (body.email ?? "").toString().trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, code: "invalid_format", message: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const domain = email.split("@")[1];
  const suggestion = DOMAIN_TYPOS[domain];
  if (suggestion) {
    const corrected = email.replace(`@${domain}`, `@${suggestion}`);
    return NextResponse.json(
      {
        ok: false,
        code: "typo_detected",
        message: `Did you mean ${corrected}?`,
        suggested: corrected,
      },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl(req)}/auth/callback?intent=signin`,
    },
  });

  if (error) {
    console.error("[send-signin-link]", error.message, {
      email,
      errorCode: (error as any).code,
      projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });

    return NextResponse.json(
      { ok: false, code: "send_failed", message: "We couldn't send a sign-in link for this email. Please try again or sign in with your password." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
});
