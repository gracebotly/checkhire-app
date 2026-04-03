import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { sendAndLogNotification } from "@/lib/email/logNotification";

export const GET = withApiHandler(
  async (
    _req: Request,
    { params }: { params: Promise<{ id: string; iid: string }> }
  ) => {
    const { id, iid } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: interest } = await supabase
      .from("deal_interest")
      .select("id, deal_id, user_id")
      .eq("id", iid)
      .eq("deal_id", id)
      .maybeSingle();

    if (!interest) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Thread not found" },
        { status: 404 }
      );
    }

    const { data: deal } = await supabase
      .from("deals")
      .select("client_user_id")
      .eq("id", id)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    const isApplicant = interest.user_id === user.id;
    const isClient = deal.client_user_id === user.id;

    if (!isApplicant && !isClient) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Not a thread participant" },
        { status: 403 }
      );
    }

    const { data: messages, error } = await supabase
      .from("deal_activity_log")
      .select(
        "*, user:user_profiles!deal_activity_log_user_id_profile_fkey(display_name, avatar_url)"
      )
      .eq("deal_id", id)
      .eq("interest_id", iid)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: error.message },
        { status: 500 }
      );
    }

    const fileEntries = (messages || []).filter(
      (message) => message.entry_type === "file" && message.file_url
    );

    for (const entry of fileEntries) {
      const { data: signed } = await supabase.storage
        .from("deal-files")
        .createSignedUrl(entry.file_url as string, 60 * 15);

      if (signed?.signedUrl) {
        entry.file_url = signed.signedUrl;
      }
    }

    return NextResponse.json({ ok: true, messages: messages || [] });
  }
);

export const POST = withApiHandler(
  async (
    req: Request,
    { params }: { params: Promise<{ id: string; iid: string }> }
  ) => {
    const { id, iid } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const content = body.content?.trim();

    if (!content || content.length < 1 || content.length > 2000) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Message must be 1-2000 characters",
        },
        { status: 400 }
      );
    }

    const { data: interest } = await supabase
      .from("deal_interest")
      .select("id, deal_id, user_id, status")
      .eq("id", iid)
      .eq("deal_id", id)
      .maybeSingle();

    if (!interest) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Thread not found" },
        { status: 404 }
      );
    }

    if (interest.status === "rejected" || interest.status === "withdrawn") {
      return NextResponse.json(
        {
          ok: false,
          code: "THREAD_CLOSED",
          message: "This conversation is closed",
        },
        { status: 400 }
      );
    }

    const { data: deal } = await supabase
      .from("deals")
      .select("client_user_id, title, deal_link_slug")
      .eq("id", id)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    const isApplicant = interest.user_id === user.id;
    const isClient = deal.client_user_id === user.id;

    if (!isApplicant && !isClient) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Not a thread participant" },
        { status: 403 }
      );
    }

    const { data: entry, error } = await supabase
      .from("deal_activity_log")
      .insert({
        deal_id: id,
        user_id: user.id,
        interest_id: iid,
        entry_type: "message",
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

    if (isClient && interest.status === "pending") {
      const serviceClient = createServiceClient();
      await serviceClient
        .from("deal_interest")
        .update({ status: "in_conversation" })
        .eq("id", iid);
    }

    const serviceClient = createServiceClient();
    const otherUserId = isClient ? interest.user_id : deal.client_user_id;
    const { data: senderProfile } = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    const { data: recipientProfile } = await serviceClient
      .from("user_profiles")
      .select("email")
      .eq("id", otherUserId)
      .maybeSingle();

    if (recipientProfile?.email) {
      await sendAndLogNotification({
        supabase: serviceClient,
        type: "interest_received",
        userId: otherUserId,
        dealId: id,
        email: recipientProfile.email,
        data: {
          dealTitle: deal.title,
          dealSlug: deal.deal_link_slug,
          otherPartyName: senderProfile?.display_name || "Someone",
        },
      });
    }

    return NextResponse.json({ ok: true, entry });
  }
);
