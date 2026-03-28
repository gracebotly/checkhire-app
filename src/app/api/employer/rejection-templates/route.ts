import { withApiHandler } from "@/lib/api/withApiHandler";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employer/rejection-templates
 * Returns platform defaults + employer's custom rejection templates.
 */
export const GET = withApiHandler(async function GET() {
  const ctx = await getEmployerForUser();
  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  const { data: defaults } = await supabaseAdmin
    .from("rejection_templates")
    .select("*")
    .is("employer_id", null)
    .eq("is_default", true)
    .order("created_at", { ascending: true });

  const { data: custom } = await supabaseAdmin
    .from("rejection_templates")
    .select("*")
    .eq("employer_id", ctx.employerId)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    ok: true,
    templates: [...(defaults || []), ...(custom || [])],
  });
});

/**
 * POST /api/employer/rejection-templates
 * Saves a custom rejection template.
 */
export const POST = withApiHandler(async function POST(req: Request) {
  const ctx = await getEmployerForUser();
  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { name, message_text } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json(
      { ok: false, code: "INVALID_NAME", message: "Template name required (min 2 chars)." },
      { status: 400 }
    );
  }
  if (!message_text || typeof message_text !== "string" || message_text.trim().length < 10) {
    return NextResponse.json(
      { ok: false, code: "INVALID_MESSAGE", message: "Message text required (min 10 chars)." },
      { status: 400 }
    );
  }

  const { data: template, error } = await supabaseAdmin
    .from("rejection_templates")
    .insert({
      employer_id: ctx.employerId,
      name: name.trim(),
      message_text: message_text.trim(),
      is_default: false,
    })
    .select("id, name, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, code: "INSERT_FAILED", message: "Failed to save template." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, template });
});
