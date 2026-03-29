import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { recalculateScore } from "@/lib/employer/recalculateScore";
import type { FlagReason } from "@/types/database";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_REASONS: FlagReason[] = [
  "impersonation",
  "ghost_job",
  "data_harvesting",
  "sensitive_info_request",
  "mlm_suspected",
  "predatory_listing",
  "unresponsive",
  "bait_and_switch",
  "other",
];

const SEVERITY_MAP: Record<FlagReason, number> = {
  impersonation: 3,
  data_harvesting: 3,
  mlm_suspected: 2,
  predatory_listing: 2,
  bait_and_switch: 2,
  sensitive_info_request: 2,
  ghost_job: 1,
  unresponsive: 1,
  other: 1,
};

/**
 * POST /api/flags — Create a flag against an employer or listing.
 * Body: { target_type: 'employer'|'listing', target_id: string, reason: FlagReason, description?: string }
 *
 * Auto-sets reporter_id from auth session.
 * Auto-sets severity_weight based on reason.
 * Checks flag velocity: if 3+ flags on same target in 48h, auto-pauses the target.
 */
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

  const body = await req.json().catch(() => ({}));
  const targetType = (body?.target_type ?? "").toString();
  const targetId = (body?.target_id ?? "").toString();
  const reason = (body?.reason ?? "").toString() as FlagReason;
  const description = (body?.description ?? "").toString().trim().slice(0, 2000) || null;

  // Validate target_type
  if (!["employer", "listing"].includes(targetType)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_TARGET", message: "target_type must be 'employer' or 'listing'." },
      { status: 400 }
    );
  }

  // Validate reason
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_REASON", message: "Invalid flag reason.", valid_reasons: VALID_REASONS },
      { status: 400 }
    );
  }

  // Validate target exists
  if (targetType === "employer") {
    const { data: emp } = await supabaseAdmin
      .from("employers")
      .select("id")
      .eq("id", targetId)
      .maybeSingle();
    if (!emp) {
      return NextResponse.json(
        { ok: false, code: "TARGET_NOT_FOUND", message: "Employer not found." },
        { status: 404 }
      );
    }
  } else {
    const { data: listing } = await supabaseAdmin
      .from("job_listings")
      .select("id")
      .eq("id", targetId)
      .maybeSingle();
    if (!listing) {
      return NextResponse.json(
        { ok: false, code: "TARGET_NOT_FOUND", message: "Listing not found." },
        { status: 404 }
      );
    }
  }

  // Prevent duplicate flags from same user on same target
  const { data: existing } = await supabaseAdmin
    .from("flags")
    .select("id")
    .eq("reporter_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .in("status", ["pending", "investigating"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { ok: false, code: "ALREADY_FLAGGED", message: "You already have an open flag on this target." },
      { status: 409 }
    );
  }

  // Determine reporter_type from user_profiles
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  const reporterType = profile?.user_type === "employer" ? "employer" : "applicant";
  const severityWeight = SEVERITY_MAP[reason] ?? 1;

  // Insert flag
  const { data: flag, error } = await supabaseAdmin
    .from("flags")
    .insert({
      reporter_id: user.id,
      reporter_type: reporterType,
      target_type: targetType,
      target_id: targetId,
      reason,
      description,
      severity_weight: severityWeight,
    })
    .select("id, status, severity_weight, created_at")
    .single();

  if (error) {
    console.error("[flags] Insert error:", error.message);
    return NextResponse.json(
      { ok: false, code: "INSERT_FAILED", message: "Failed to submit flag." },
      { status: 500 }
    );
  }

  // ─── Flag velocity circuit breaker ───
  // If 3+ flags on the same target in the last 48 hours, auto-pause
  const { count: recentCount } = await supabaseAdmin
    .from("flags")
    .select("id", { count: "exact", head: true })
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

  let autoPaused = false;

  if (recentCount && recentCount >= 3) {
    if (targetType === "listing") {
      const { error: pauseErr } = await supabaseAdmin
        .from("job_listings")
        .update({ status: "paused" })
        .eq("id", targetId)
        .in("status", ["active"]); // only pause active listings
      if (!pauseErr) autoPaused = true;
    } else if (targetType === "employer") {
      const { error: restrictErr } = await supabaseAdmin
        .from("employers")
        .update({ account_status: "restricted" })
        .eq("id", targetId)
        .eq("account_status", "active"); // only restrict active accounts
      if (!restrictErr) autoPaused = true;

      // Also recalculate their score
      recalculateScore(targetId).catch(() => {});
    }

    if (autoPaused) {
      console.log(
        `[flags] Circuit breaker triggered: ${targetType} ${targetId} auto-paused (${recentCount} flags in 48h)`
      );
    }
  }

  return NextResponse.json({
    ok: true,
    flag: {
      id: flag.id,
      status: flag.status,
      severity_weight: flag.severity_weight,
      created_at: flag.created_at,
    },
    auto_paused: autoPaused,
    message: "Thank you for your report. Our team will review it.",
  });
});

/**
 * GET /api/flags — List the current user's submitted flags.
 */
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

  // User can only see their own flags (RLS enforces this too)
  const { data: flags, error } = await supabase
    .from("flags")
    .select("id, target_type, target_id, reason, description, status, severity_weight, resolution_notes, created_at, resolved_at")
    .eq("reporter_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[flags] Query error:", error.message);
    return NextResponse.json(
      { ok: false, code: "QUERY_FAILED", message: "Failed to load flags." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, flags: flags || [] });
});
