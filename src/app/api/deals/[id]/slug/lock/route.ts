import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const POST = withApiHandler(
  async (
    _req: Request,
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

    // Verify ownership and check if already locked
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
        { ok: false, code: "FORBIDDEN", message: "Not authorized" },
        { status: 403 }
      );
    }

    // Already locked — no-op success
    if (deal.slug_locked) {
      return NextResponse.json({ ok: true, already_locked: true });
    }

    const { error } = await supabase
      .from("deals")
      .update({ slug_locked: true })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  }
);
