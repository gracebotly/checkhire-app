import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { updateDealSlugSchema } from "@/lib/validation/deals";

export const PATCH = withApiHandler(
  async (
    req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
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
    const parsed = updateDealSlugSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid slug",
        },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: deal } = await supabase
      .from("deals")
      .select("id, client_user_id, slug_locked")
      .eq("id", id)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    if (deal.client_user_id !== user.id) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Only the client can edit the link" },
        { status: 403 }
      );
    }

    if (deal.slug_locked) {
      return NextResponse.json(
        { ok: false, code: "SLUG_LOCKED", message: "This link has been locked and can no longer be changed." },
        { status: 400 }
      );
    }

    // Check uniqueness
    const { data: existing } = await supabase
      .from("deals")
      .select("id")
      .eq("deal_link_slug", parsed.data.slug)
      .neq("id", id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          code: "SLUG_TAKEN",
          message: "This link is already taken. Try a different one.",
        },
        { status: 409 }
      );
    }

    // Update slug and lock it — this is the one allowed customization
    const { error: updateError } = await supabase
      .from("deals")
      .update({ deal_link_slug: parsed.data.slug, slug_locked: true })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, slug: parsed.data.slug });
  }
);
