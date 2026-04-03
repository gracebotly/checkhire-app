import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { verifyAdmin } from "@/lib/api/verifyAdmin";
import { createServiceClient } from "@/lib/supabase/service";
import { adminCreateScamCheckSchema } from "@/lib/validation/scam-check";
import { notifyAdmin } from "@/lib/slack/notify";
import { scamCheckSubmitted } from "@/lib/slack/templates";

// GET — list all submissions with optional status filter
export const GET = withApiHandler(async (req: Request) => {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const serviceClient = createServiceClient();

  let query = serviceClient
    .from("scam_submissions")
    .select("*", { count: "exact" });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    return NextResponse.json(
      { ok: false, code: "QUERY_FAILED", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    submissions: data,
    total: count,
    page,
    pageSize,
  });
});

// POST — admin manually creates a submission (from Reddit DM, Discord, etc.)
export const POST = withApiHandler(async (req: Request) => {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const body = await req.json();
  const parsed = adminCreateScamCheckSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient();

  const { data, error } = await serviceClient
    .from("scam_submissions")
    .insert({
      ...parsed.data,
      submitted_by_email: parsed.data.submitted_by_email || null,
      submitted_by_name: parsed.data.submitted_by_name || null,
      description: parsed.data.description || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, code: "INSERT_FAILED", message: error.message },
      { status: 500 }
    );
  }

  // Slack notification for manual entries too
  notifyAdmin(scamCheckSubmitted({
    id: data.id,
    url: parsed.data.url,
    platform: parsed.data.platform || "other",
    email: parsed.data.submitted_by_email || undefined,
    description: parsed.data.description || undefined,
    source: parsed.data.source || "reddit_dm",
  }));

  return NextResponse.json({ ok: true, id: data.id });
});
