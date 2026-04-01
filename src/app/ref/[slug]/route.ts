import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: user } = await supabase
    .from("user_profiles")
    .select("referral_code")
    .eq("referral_slug", slug.toLowerCase())
    .single();

  const redirectUrl = new URL("/", request.url);

  if (!user?.referral_code) {
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set("checkhire_ref", user.referral_code, {
    maxAge: 30 * 24 * 60 * 60,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}
