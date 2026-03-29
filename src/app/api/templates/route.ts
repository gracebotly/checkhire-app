import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createTemplateSchema } from "@/lib/validation/deals";

export const GET = withApiHandler(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
      { status: 401 }
    );

  const { data: templates, error } = await supabase
    .from("deal_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, code: "DB_ERROR", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, templates: templates || [] });
});

export const POST = withApiHandler(async (req: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
      { status: 401 }
    );

  const body = await req.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message || "Invalid input",
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const { data: template, error } = await supabase
    .from("deal_templates")
    .insert({
      user_id: user.id,
      template_name: data.template_name,
      title: data.title,
      description: data.description || null,
      deliverables: data.deliverables || null,
      default_amount: data.default_amount,
      default_deadline_days: data.default_deadline_days,
      has_milestones: data.has_milestones,
      milestone_templates: data.milestone_templates || [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, code: "DB_ERROR", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, template });
});
