import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { seekerProfileSchema } from "@/lib/validation/seekerProfileSchema";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  const { data: profile, error } = await supabase
    .from("seeker_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, code: "QUERY_FAILED", message: "Failed to load profile." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, profile });
});

export const POST = withApiHandler(async function POST(req: Request) {
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

  const { data: existing } = await supabase
    .from("seeker_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        ok: false,
        code: "ALREADY_EXISTS",
        message: "Profile already exists. Use PATCH to update.",
      },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const result = seekerProfileSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: result.error.errors[0]?.message || "Invalid profile data.",
      },
      { status: 400 }
    );
  }

  const { error: insertError } = await supabaseAdmin.from("seeker_profiles").insert({
    id: user.id,
    ...result.data,
  });

  if (insertError) {
    console.error("[api/seeker/profile] Insert error:", insertError.message);
    return NextResponse.json(
      { ok: false, code: "INSERT_FAILED", message: "Failed to create profile." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
});

export const PATCH = withApiHandler(async function PATCH(req: Request) {
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

  const body = await req.json().catch(() => ({}));
  const result = seekerProfileSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: result.error.errors[0]?.message || "Invalid profile data.",
      },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("seeker_profiles")
    .update(result.data)
    .eq("id", user.id);

  if (updateError) {
    console.error("[api/seeker/profile] Update error:", updateError.message);
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to update profile." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
});
