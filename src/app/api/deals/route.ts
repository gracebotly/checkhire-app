import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createDealSchema } from "@/lib/validation/deals";
import { generateSlug } from "@/lib/deals/generateSlug";
import { checkBlocklist } from "@/lib/validation/blocklist";
import { sendAndLogNotification } from "@/lib/email/logNotification";
import { calculateRiskScore } from "@/lib/moderation/riskScore";

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

  // Require email verification before creating gigs
  if (!user.email_confirmed_at) {
    return NextResponse.json(
      {
        ok: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before creating a gig. Check your inbox for a confirmation link.",
      },
      { status: 403 }
    );
  }

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

  // Compliance check — block prohibited gig content
  const contentToCheck = `${data.title} ${data.description} ${data.deliverables} ${data.other_category_description || ""}`;
  const blockedTerm = checkBlocklist(contentToCheck);
  if (blockedTerm) {
    return NextResponse.json(
      { ok: false, code: "BLOCKED_CONTENT", message: "This gig may not comply with our Acceptable Use Policy. Please review your description or contact support.", link: "/faq#acceptable-use" },
      { status: 400 }
    );
  }

  // ── Risk-based moderation ──
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("completed_deals_count, trust_badge, email")
    .eq("id", user.id)
    .maybeSingle();

  const { count: existingDealCount } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("client_user_id", user.id);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentDealCount } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("client_user_id", user.id)
    .gte("created_at", oneHourAgo);

  const riskAssessment = calculateRiskScore({
    completedDealsCount: userProfile?.completed_deals_count ?? 0,
    trustBadge: userProfile?.trust_badge ?? "new",
    dealAmount: data.total_amount,
    title: data.title,
    description: data.description,
    deliverables: data.deliverables ?? null,
    category: data.category ?? null,
    otherCategoryDescription: data.other_category_description ?? null,
    email: userProfile?.email ?? null,
    existingDealCount: existingDealCount ?? 0,
    recentDealCount: recentDealCount ?? 0,
  });

  const flagForReview = riskAssessment.shouldFlag;
  const flagReason: string | null = riskAssessment.shouldFlag
    ? riskAssessment.reasons.join(" | ")
    : null;

  const slug = await generateSlug(supabase, data.title);

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .insert({
      title: data.title,
      description: data.description,
      deliverables: data.deliverables,
      total_amount: data.total_amount,
      category: data.category,
      other_category_description: data.other_category_description || null,
      payment_frequency: data.payment_frequency || "one_time",
      flagged_for_review: flagForReview,
      flagged_reason: flagReason,
      review_status: flagForReview ? "pending" : "approved",
      risk_score: riskAssessment.score,
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

  // Insert acceptance criteria
  if (data.acceptance_criteria && data.acceptance_criteria.length > 0) {
    const criteriaRows = data.acceptance_criteria.map((c, i) => ({
      deal_id: deal.id,
      evidence_type: c.evidence_type,
      description: c.description,
      position: i,
    }));

    const { error: criteriaError } = await supabase
      .from("acceptance_criteria")
      .insert(criteriaRows);

    if (criteriaError) {
      console.error("Acceptance criteria insert error:", criteriaError);
    }
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
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  await supabase.from("deal_activity_log").insert({
    deal_id: deal.id,
    user_id: null,
    entry_type: "system",
    content: `Gig created by ${profile?.display_name || "Unknown"}`,
  });

  // Notify creator
  if (profile?.email) {
    const serviceClient = createServiceClient();
    await sendAndLogNotification({
      supabase: serviceClient,
      type: "deal_created",
      userId: user.id,
      dealId: deal.id,
      email: profile.email,
      data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug },
    });
  }

  return NextResponse.json({ ok: true, deal, slug: deal.deal_link_slug });
});
