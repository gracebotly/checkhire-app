import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createDealSchema } from "@/lib/validation/deals";
import { generateSlug } from "@/lib/deals/generateSlug";

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
  const parsed = createDealSchema.safeParse(body);
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
  const slug = await generateSlug(supabase);

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .insert({
      title: data.title,
      description: data.description,
      deliverables: data.deliverables,
      total_amount: data.total_amount,
      category: data.category,
      deadline: data.deadline,
      deal_type: data.deal_type,
      deal_link_slug: slug,
      client_user_id: user.id,
      has_milestones: data.has_milestones,
      template_id: data.template_id || null,
      status: "pending_acceptance",
      escrow_status: "unfunded",
    })
    .select()
    .single();

  if (dealError) {
    return NextResponse.json(
      { ok: false, code: "DB_ERROR", message: dealError.message },
      { status: 500 }
    );
  }

  // Insert milestones if applicable
  if (data.has_milestones && data.milestones && data.milestones.length > 0) {
    const milestoneRows = data.milestones.map((m, i) => ({
      deal_id: deal.id,
      title: m.title,
      description: m.description || null,
      amount: m.amount,
      position: i,
    }));

    const { error: msError } = await supabase
      .from("milestones")
      .insert(milestoneRows);

    if (msError) {
      console.error("Milestone insert error:", msError);
    }
  }

  // Increment template use_count if from template
  if (data.template_id) {
    const { data: tmpl } = await supabase
      .from("deal_templates")
      .select("use_count")
      .eq("id", data.template_id)
      .maybeSingle();

    if (tmpl) {
      await supabase
        .from("deal_templates")
        .update({ use_count: (tmpl.use_count || 0) + 1 })
        .eq("id", data.template_id);
    }
  }

  // Insert system activity log
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  await supabase.from("deal_activity_log").insert({
    deal_id: deal.id,
    user_id: null,
    entry_type: "system",
    content: `Gig created by ${profile?.display_name || "Unknown"}`,
  });

  return NextResponse.json({ ok: true, deal, slug: deal.deal_link_slug });
});
