import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const POST = withApiHandler(
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

    // Verify participant
    const { data: deal } = await supabase
      .from("deals")
      .select("client_user_id, freelancer_user_id")
      .eq("id", id)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    if (
      deal.client_user_id !== user.id &&
      deal.freelancer_user_id !== user.id
    ) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Not a participant" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const content = body.content?.trim();

    if (!content || content.length < 1 || content.length > 1000) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Content must be 1-1000 characters",
        },
        { status: 400 }
      );
    }

    const { data: entry, error } = await supabase
      .from("deal_activity_log")
      .insert({
        deal_id: id,
        user_id: user.id,
        entry_type: "text",
        content,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, entry });
  }
);
