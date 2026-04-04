import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(req.url);
    const field = url.searchParams.get("field");

    if (field !== "description" && field !== "deliverables") {
      return NextResponse.json({ ok: false, message: "Invalid field" }, { status: 400 });
    }

    const column = field === "description" ? "description_brief_url" : "deliverables_brief_url";

    // Use regular client to check deal access (respects RLS on deals table)
    const { data: deal } = await supabase
      .from("deals")
      .select(`${column}, client_user_id, freelancer_user_id, guest_freelancer_email`)
      .eq("id", id)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json({ ok: false, message: "Deal not found" }, { status: 404 });
    }

    // Verify the user is a participant
    const isParticipant = deal.client_user_id === user.id || deal.freelancer_user_id === user.id;

    if (!isParticipant) {
      return NextResponse.json({ ok: false, message: "Not authorized" }, { status: 403 });
    }

    const storagePath = deal[column as keyof typeof deal] as string | null;
    if (!storagePath) {
      return NextResponse.json({ ok: false, message: "No brief attached" }, { status: 404 });
    }

    // Use service client for signed URL generation (bypasses storage RLS)
    const serviceClient = createServiceClient();
    const { data: signed } = await serviceClient.storage
      .from("deal-files")
      .createSignedUrl(storagePath, 60 * 15);

    if (!signed?.signedUrl) {
      return NextResponse.json({ ok: false, message: "Could not generate download link" }, { status: 500 });
    }

    return NextResponse.redirect(signed.signedUrl);
  }
);
