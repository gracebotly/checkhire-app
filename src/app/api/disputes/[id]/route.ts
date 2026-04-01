import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { verifyGuestToken } from "@/lib/deals/guestToken";

export const GET = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const serviceClient = createServiceClient();

    // Fetch dispute with deal info
    const { data: dispute } = await serviceClient
      .from("disputes")
      .select(
        `*, deal:deals!inner(id, title, description, deliverables, total_amount, deal_link_slug, status, escrow_status, client_user_id, freelancer_user_id, guest_freelancer_email, guest_freelancer_name, has_milestones, created_at, funded_at, submitted_at, completed_at)`
      )
      .eq("id", id)
      .maybeSingle();

    if (!dispute)
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Dispute not found" },
        { status: 404 }
      );

    const deal = dispute.deal as {
      id: string;
      client_user_id: string;
      freelancer_user_id: string | null;
      guest_freelancer_email: string | null;
      guest_freelancer_name: string | null;
      has_milestones: boolean;
    };

    // Auth: session, guest token, or admin
    let isParticipant = false;
    let isAdmin = false;

    // Check for guest token in query params
    const url = new URL(req.url);
    const guestToken = url.searchParams.get("guest_token");

    if (guestToken && deal.guest_freelancer_email) {
      if (verifyGuestToken(guestToken, deal.id, deal.guest_freelancer_email)) {
        isParticipant = true;
      }
    }

    if (!isParticipant) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        if (deal.client_user_id === user.id || deal.freelancer_user_id === user.id) {
          isParticipant = true;
        }
        // Check admin
        const { data: profile } = await serviceClient
          .from("user_profiles")
          .select("is_platform_admin")
          .eq("id", user.id)
          .maybeSingle();
        isAdmin = profile?.is_platform_admin === true;
      }
    }

    if (!isParticipant && !isAdmin)
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Access denied" },
        { status: 403 }
      );

    // Fetch all evidence
    const { data: evidence } = await serviceClient
      .from("dispute_evidence")
      .select("*")
      .eq("dispute_id", id)
      .order("created_at", { ascending: true });

    // Generate signed URLs for file evidence
    const evidenceWithUrls = [];
    for (const item of evidence || []) {
      if (item.file_url) {
        const { data: signed } = await serviceClient.storage
          .from("dispute-evidence")
          .createSignedUrl(item.file_url, 60 * 15);
        evidenceWithUrls.push({
          ...item,
          file_url: signed?.signedUrl || item.file_url,
        });
      } else {
        evidenceWithUrls.push(item);
      }
    }

    // Fetch milestones if applicable
    let milestones = null;
    if (deal.has_milestones) {
      const { data: ms } = await serviceClient
        .from("milestones")
        .select("*")
        .eq("deal_id", deal.id)
        .order("position", { ascending: true });
      milestones = ms;
    }

    // Fetch activity log for context
    const { data: activity } = await serviceClient
      .from("deal_activity_log")
      .select(
        `*, user:user_profiles!deal_activity_log_user_id_profile_fkey(display_name, avatar_url)`
      )
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: true });

    // Fetch participant profiles
    const { data: clientProfile } = await serviceClient
      .from("user_profiles")
      .select("display_name, avatar_url, trust_badge, completed_deals_count, email")
      .eq("id", deal.client_user_id)
      .maybeSingle();

    let freelancerProfile = null;
    if (deal.freelancer_user_id) {
      const { data: fp } = await serviceClient
        .from("user_profiles")
        .select("display_name, avatar_url, trust_badge, completed_deals_count, email")
        .eq("id", deal.freelancer_user_id)
        .maybeSingle();
      freelancerProfile = fp;
    }

    // For guest freelancers, create a minimal profile object
    let guestFreelancerInfo = null;
    if (deal.guest_freelancer_email && !deal.freelancer_user_id) {
      guestFreelancerInfo = {
        display_name: deal.guest_freelancer_name,
        email: deal.guest_freelancer_email,
      };
    }

    return NextResponse.json({
      ok: true,
      dispute,
      evidence: evidenceWithUrls,
      milestones,
      activity: activity || [],
      client: clientProfile,
      freelancer: freelancerProfile,
      guestFreelancer: guestFreelancerInfo,
    });
  }
);
