import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { verifyGuestToken } from "@/lib/deals/guestToken";
import { sendAndLogNotification } from "@/lib/email/logNotification";

export const GET = withApiHandler(
  async (
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
  ) => {
    const { slug } = await params;
    const supabase = await createClient();
    const url = new URL(req.url);
    const guestToken = url.searchParams.get("guest_token");
    const acceptParam = url.searchParams.get("accept");

    // Fetch deal with participants
    const { data: deal, error } = await supabase
      .from("deals")
      .select(
        `*, client:user_profiles!deals_client_user_id_profile_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug), freelancer:user_profiles!deals_freelancer_user_id_profile_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug, stripe_onboarding_complete)`
      )
      .eq("deal_link_slug", slug)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: error.message },
        { status: 500 }
      );
    }

    if (!deal) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    // Determine viewer role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let role: "client" | "freelancer" | "visitor" = "visitor";
    let useServiceClient = false;

    if (user) {
      if (deal.client_user_id === user.id) role = "client";
      else if (deal.freelancer_user_id === user.id) role = "freelancer";
    }

    // Guest token check — if no authenticated user or authenticated but not a participant
    if (role === "visitor" && guestToken && deal.guest_freelancer_email) {
      if (verifyGuestToken(guestToken, deal.id, deal.guest_freelancer_email)) {
        role = "freelancer";
        useServiceClient = true;
      }
    }

    // Handle ?accept=true for OAuth return flow
    if (user && acceptParam === "true" && role !== "client") {
      if (deal.status === "pending_acceptance" && !deal.freelancer_user_id && !deal.guest_freelancer_email) {
        // Verify user is NOT the client
        if (deal.client_user_id !== user.id) {
          const serviceClient = createServiceClient();

          // Auto-accept
          const newStatus = deal.escrow_status === "funded" ? "in_progress" : deal.status;
          await serviceClient.from("deals").update({
            freelancer_user_id: user.id,
            status: newStatus,
          }).eq("id", deal.id);

          // Get the accepting user's name
          const { data: acceptorProfile } = await serviceClient
            .from("user_profiles")
            .select("display_name, email")
            .eq("id", user.id)
            .maybeSingle();
          const acceptorName = acceptorProfile?.display_name || "A freelancer";

          // Activity log
          await serviceClient.from("deal_activity_log").insert({
            deal_id: deal.id,
            user_id: null,
            entry_type: "system",
            content: `${acceptorName} accepted the gig`,
          });

          // Email to client
          const { data: clientProfile } = await serviceClient
            .from("user_profiles")
            .select("email")
            .eq("id", deal.client_user_id)
            .maybeSingle();

          if (clientProfile?.email) {
            await sendAndLogNotification({
              supabase: serviceClient,
              type: "deal_accepted",
              userId: deal.client_user_id,
              dealId: deal.id,
              email: clientProfile.email,
              data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, otherPartyName: acceptorName },
            });
          }

          // Email to freelancer based on escrow status
          if (acceptorProfile?.email) {
            if (deal.escrow_status === "funded") {
              await sendAndLogNotification({
                supabase: serviceClient,
                type: "escrow_funded_after_accept",
                userId: user.id,
                dealId: deal.id,
                email: acceptorProfile.email,
                data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, amount: deal.total_amount },
              });
            } else {
              await sendAndLogNotification({
                supabase: serviceClient,
                type: "deal_accepted_escrow_pending",
                userId: user.id,
                dealId: deal.id,
                email: acceptorProfile.email,
                data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug },
              });
            }
          }

          role = "freelancer";
        }
      }
    }

    let milestones = null;
    let activity = null;

    if (role !== "visitor") {
      const queryClient = useServiceClient ? createServiceClient() : supabase;

      // Fetch milestones
      const { data: ms } = await queryClient
        .from("milestones")
        .select("*")
        .eq("deal_id", deal.id)
        .order("position", { ascending: true });
      milestones = ms || [];

      // Fetch activity log
      const { data: acts } = await queryClient
        .from("deal_activity_log")
        .select(
          `*, user:user_profiles!deal_activity_log_user_id_profile_fkey(display_name, avatar_url)`
        )
        .eq("deal_id", deal.id)
        .order("created_at", { ascending: true });
      activity = acts || [];

      if (activity.length > 0) {
        const signClient = useServiceClient ? createServiceClient() : supabase;
        const fileEntries = activity.filter(
          (entry: { entry_type: string; file_url: string | null }) => entry.entry_type === "file" && entry.file_url
        );

        for (const entry of fileEntries) {
          const { data: signed } = await signClient.storage
            .from("deal-files")
            .createSignedUrl(entry.file_url as string, 60 * 15);

          if (signed?.signedUrl) {
            entry.file_url = signed.signedUrl;
          }
        }
      }
    }

    // Include guest freelancer info in response
    const guestFreelancer = deal.guest_freelancer_email ? {
      name: deal.guest_freelancer_name,
      email: deal.guest_freelancer_email,
    } : null;

    return NextResponse.json({
      ok: true,
      deal,
      milestones,
      activity,
      role,
      guestFreelancer,
    });
  }
);
