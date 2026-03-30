import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { submitInterestSchema } from "@/lib/validation/interest";
import { sendAndLogNotification } from "@/lib/email/logNotification";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
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
    const parsed = submitInterestSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );

    const { pitch_text } = parsed.data;

    // Fetch deal
    const { data: deal } = await supabase
      .from("deals")
      .select("id, title, deal_link_slug, deal_type, status, client_user_id, freelancer_user_id, total_amount")
      .eq("id", id)
      .maybeSingle();

    if (!deal)
      return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Deal not found" }, { status: 404 });

    if (deal.deal_type !== "public")
      return NextResponse.json({ ok: false, code: "INVALID_TYPE", message: "This is not a public gig" }, { status: 400 });

    if (deal.status !== "pending_acceptance")
      return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "This gig is no longer accepting interest" }, { status: 400 });

    if (deal.freelancer_user_id)
      return NextResponse.json({ ok: false, code: "ALREADY_FILLED", message: "This gig already has a freelancer" }, { status: 400 });

    if (deal.client_user_id === user.id)
      return NextResponse.json({ ok: false, code: "SELF_INTEREST", message: "You cannot express interest in your own gig" }, { status: 400 });

    // Check existing interest
    const { data: existing } = await supabase
      .from("deal_interest")
      .select("id")
      .eq("deal_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing)
      return NextResponse.json({ ok: false, code: "ALREADY_INTERESTED", message: "You have already expressed interest in this gig" }, { status: 400 });

    // Insert interest
    const { data: interest, error: insertError } = await supabase
      .from("deal_interest")
      .insert({ deal_id: id, user_id: user.id, pitch_text })
      .select()
      .single();

    if (insertError)
      return NextResponse.json({ ok: false, code: "DB_ERROR", message: insertError.message }, { status: 500 });

    // Activity log
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const serviceClient = createServiceClient();
    await serviceClient.from("deal_activity_log").insert({
      deal_id: id,
      user_id: null,
      entry_type: "system",
      content: `${profile?.display_name || "Someone"} expressed interest`,
    });

    // Notify client
    const { data: clientProfile } = await serviceClient
      .from("user_profiles")
      .select("email")
      .eq("id", deal.client_user_id)
      .maybeSingle();

    if (clientProfile?.email) {
      await sendAndLogNotification({
        supabase: serviceClient,
        type: "interest_received",
        userId: deal.client_user_id,
        dealId: id,
        email: clientProfile.email,
        data: {
          dealTitle: deal.title,
          dealSlug: deal.deal_link_slug,
          otherPartyName: profile?.display_name || "A freelancer",
        },
      });
    }

    return NextResponse.json({ ok: true, interest });
  }
);
