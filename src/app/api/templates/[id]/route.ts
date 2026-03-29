import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const DELETE = withApiHandler(
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

    // Verify ownership
    const { data: template } = await supabase
      .from("deal_templates")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (!template) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Template not found" },
        { status: 404 }
      );
    }

    if (template.user_id !== user.id) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Not your template" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("deal_templates")
      .delete()
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
