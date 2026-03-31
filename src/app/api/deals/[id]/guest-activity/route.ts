import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { verifyGuestToken } from "@/lib/deals/guestToken";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await req.json();

    const guestToken = body.guest_token;
    if (!guestToken || typeof guestToken !== "string") {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Guest token required" },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Fetch deal to get guest email
    const { data: deal } = await supabase
      .from("deals")
      .select("id, guest_freelancer_email")
      .eq("id", id)
      .maybeSingle();

    if (!deal || !deal.guest_freelancer_email) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    // Verify guest token
    if (!verifyGuestToken(guestToken, id, deal.guest_freelancer_email)) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const content = body.content?.trim();
    if (!content || content.length < 1 || content.length > 1000) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Content must be 1-1000 characters" },
        { status: 400 }
      );
    }

    const { data: entry, error } = await supabase
      .from("deal_activity_log")
      .insert({
        deal_id: id,
        user_id: null,
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
