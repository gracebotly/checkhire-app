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
 * GET /api/employer/question-templates
 *
 * Returns platform default templates + employer's custom templates.
 */
export const GET = withApiHandler(async function GET() {
  const ctx = await getEmployerForUser();
  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  // Fetch platform defaults
  const { data: defaults } = await supabaseAdmin
    .from("question_templates")
    .select("*")
    .eq("is_platform_default", true)
    .order("category", { ascending: true });

  // Fetch employer's custom templates
  const { data: custom } = await supabaseAdmin
    .from("question_templates")
    .select("*")
    .eq("employer_id", ctx.employerId)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    ok: true,
    templates: [...(defaults || []), ...(custom || [])],
  });
});

/**
 * POST /api/employer/question-templates
 *
 * Saves a custom question template for the employer.
 * Body: { name: string, category: string, questions: QuestionTemplateEntry[] }
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
  const { name, category, questions } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json(
      { ok: false, code: "INVALID_NAME", message: "Template name is required (min 2 characters)." },
      { status: 400 }
    );
  }

  const validCategories = ["remote_readiness", "sales", "technical", "customer_service", "general"];
  if (!category || !validCategories.includes(category)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_CATEGORY", message: "Valid category is required." },
      { status: 400 }
    );
  }

  if (!Array.isArray(questions) || questions.length === 0 || questions.length > 10) {
    return NextResponse.json(
      { ok: false, code: "INVALID_QUESTIONS", message: "1–10 questions required." },
      { status: 400 }
    );
  }

  const { data: template, error } = await supabaseAdmin
    .from("question_templates")
    .insert({
      employer_id: ctx.employerId,
      name: name.trim(),
      category,
      questions,
      is_platform_default: false,
    })
    .select("id, name, category, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, code: "INSERT_FAILED", message: "Failed to save template." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, template });
});
