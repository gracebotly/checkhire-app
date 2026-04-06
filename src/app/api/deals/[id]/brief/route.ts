import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { verifyGuestToken } from "@/lib/deals/guestToken";

export const GET = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const url = new URL(req.url);
    const field = url.searchParams.get("field");
    const guestToken = url.searchParams.get("guest_token");

    if (field !== "description" && field !== "deliverables") {
      return NextResponse.json({ ok: false, message: "Invalid field" }, { status: 400 });
    }

    const column = field === "description" ? "description_brief_url" : "deliverables_brief_url";

    // Try authenticated user first
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Use service client to fetch the deal (bypasses RLS for guest access check)
    const serviceClient = createServiceClient();
    const { data: deal } = await serviceClient
      .from("deals")
      .select(`${column}, client_user_id, freelancer_user_id, guest_freelancer_email`)
      .eq("id", id)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json({ ok: false, message: "Deal not found" }, { status: 404 });
    }

    // Check authorization: authenticated participant OR valid guest token
    let authorized = false;

    if (user) {
      const isParticipant = deal.client_user_id === user.id || deal.freelancer_user_id === user.id;
      if (isParticipant) authorized = true;
    }

    if (!authorized && guestToken && deal.guest_freelancer_email) {
      if (verifyGuestToken(guestToken, id, deal.guest_freelancer_email)) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { ok: false, message: user ? "Not authorized" : "Not authenticated" },
        { status: user ? 403 : 401 }
      );
    }

    const storagePath = deal[column as keyof typeof deal] as string | null;
    if (!storagePath) {
      return NextResponse.json({ ok: false, message: "No brief attached" }, { status: 404 });
    }

    // Generate signed URL using service client (bypasses storage RLS)
    const { data: signed } = await serviceClient.storage
      .from("deal-files")
      .createSignedUrl(storagePath, 60 * 15);

    if (!signed?.signedUrl) {
      return NextResponse.json({ ok: false, message: "Could not generate download link" }, { status: 500 });
    }

    return NextResponse.redirect(signed.signedUrl);
  }
);
