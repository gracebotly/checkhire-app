import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createCancellationRequestSchema } from "@/lib/validation/cancellation-requests";
import { sendAndLogNotification } from "@/lib/email/logNotification";
import { escalateCancellationRequestToDispute } from "@/lib/cancellation-requests/escalate";

const ALLOWED_STATUSES = [
  "pending_acceptance",
  "funded",
  "in_progress",
  "revision_requested",
  "submitted",
] as const;

const HARD_CAP_PER_DEAL = 3;
const RESPONSE_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
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

    const body = await req.json().catch(() => ({}));
    const parsed = createCancellationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid input",
        },
        { status: 400 }
      );
    }

    const {
      proposed_client_refund_cents,
      proposed_freelancer_payout_cents,
      reason,
    } = parsed.data;

    const serviceClient = createServiceClient();

    // Fetch deal
    const { data: deal } = await serviceClient
      .from("deals")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    // Verify participant
    const isClient = deal.client_user_id === user.id;
    const isFreelancer = deal.freelancer_user_id === user.id;
    if (!isClient && !isFreelancer) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Not a deal participant" },
        { status: 403 }
      );
    }

    // Verify deal status
    if (!ALLOWED_STATUSES.includes(deal.status)) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_STATUS",
          message: "This gig cannot be cancelled in its current state",
        },
        { status: 400 }
      );
    }

    // Validate split sums to total_amount
    const totalSplit =
      proposed_client_refund_cents + proposed_freelancer_payout_cents;
    if (totalSplit !== deal.total_amount) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_SPLIT",
          message: `Refund split must sum to the total deal amount ($${(deal.total_amount / 100).toFixed(2)}).`,
        },
        { status: 400 }
      );
    }

    // Hard cap check
    const { count: existingCount } = await serviceClient
      .from("cancellation_requests")
      .select("*", { count: "exact", head: true })
      .eq("deal_id", id);

    if ((existingCount || 0) >= HARD_CAP_PER_DEAL) {
      return NextResponse.json(
        {
          ok: false,
          code: "CAP_REACHED",
          message: `This gig has reached the maximum of ${HARD_CAP_PER_DEAL} cancellation requests. If you still need to cancel, open a dispute.`,
        },
        { status: 400 }
      );
    }

    // Concurrent pending check (defensive — also enforced by partial unique index)
    const { data: existingPending } = await serviceClient
      .from("cancellation_requests")
      .select("id")
      .eq("deal_id", id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json(
        {
          ok: false,
          code: "ALREADY_PENDING",
          message:
            "There is already a pending cancellation request for this gig. Wait for it to be responded to or expire.",
        },
        { status: 400 }
      );
    }

    // Look up requester profile
    const { data: profile } = await serviceClient
      .from("user_profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .maybeSingle();
    const requesterName = profile?.display_name || "A participant";

    const expiresAt = new Date(Date.now() + RESPONSE_WINDOW_MS).toISOString();

    // Insert the request
    const { data: cancelReq, error: insertError } = await serviceClient
      .from("cancellation_requests")
      .insert({
        deal_id: id,
        requested_by: user.id,
        requested_by_role: isClient ? "client" : "freelancer",
        proposed_client_refund_cents,
        proposed_freelancer_payout_cents,
        reason: reason || null,
        status: "pending",
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError || !cancelReq) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: insertError?.message || "Failed to create request" },
        { status: 500 }
      );
    }

    // Activity log entry
    await serviceClient.from("deal_activity_log").insert({
      deal_id: id,
      user_id: null,
      entry_type: "system",
      content: `Mutual cancellation requested by ${requesterName} — $${(proposed_client_refund_cents / 100).toFixed(2)} refund / $${(proposed_freelancer_payout_cents / 100).toFixed(2)} to freelancer`,
    });

    // Notify both parties
    const notificationData = {
      dealTitle: deal.title,
      dealSlug: deal.deal_link_slug,
      proposedClientRefund: proposed_client_refund_cents,
      proposedFreelancerPayout: proposed_freelancer_payout_cents,
      cancellationReason: reason || undefined,
      requesterName,
    };

    // Email the requester (confirmation)
    if (profile?.email) {
      await sendAndLogNotification({
        supabase: serviceClient,
        type: "cancellation_requested",
        userId: user.id,
        dealId: id,
        email: profile.email,
        data: notificationData,
      });
    }

    // Email the other party
    const otherPartyId = isClient ? deal.freelancer_user_id : deal.client_user_id;
    if (otherPartyId) {
      const { data: other } = await serviceClient
        .from("user_profiles")
        .select("email")
        .eq("id", otherPartyId)
        .maybeSingle();
      if (other?.email) {
        await sendAndLogNotification({
          supabase: serviceClient,
          type: "cancellation_requested",
          userId: otherPartyId,
          dealId: id,
          email: other.email,
          data: notificationData,
        });
      }
    } else if (deal.guest_freelancer_email && isClient) {
      // Notify guest freelancer
      await sendAndLogNotification({
        supabase: serviceClient,
        type: "cancellation_requested",
        userId: "guest",
        dealId: id,
        email: deal.guest_freelancer_email,
        data: notificationData,
      });
    }

    return NextResponse.json({ ok: true, cancellation_request: cancelReq });
  }
);

export const GET = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
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

    const serviceClient = createServiceClient();

    // Verify participant
    const { data: deal } = await serviceClient
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

    if (deal.client_user_id !== user.id && deal.freelancer_user_id !== user.id) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Not a deal participant" },
        { status: 403 }
      );
    }

    // ── LAZY FALLBACK ESCALATION ──
    // Because the user is on Vercel free tier with no scheduled cron, we
    // escalate any expired pending requests inline whenever a participant
    // fetches the list. This ensures escalation actually happens whenever
    // either party visits the deal page after the 72hr mark, even without
    // a cron firing. The cron route in File 7 also exists for the future
    // when GitHub Actions starts hitting it.
    const { data: expiredPending } = await serviceClient
      .from("cancellation_requests")
      .select("id")
      .eq("deal_id", id)
      .eq("status", "pending")
      .lte("expires_at", new Date().toISOString());

    if (expiredPending && expiredPending.length > 0) {
      for (const req of expiredPending) {
        const result = await escalateCancellationRequestToDispute({
          serviceClient,
          cancellationRequestId: req.id,
          dealId: id,
          triggeredByUserId: null,
          isAutomatic: true,
        });

        if (result.ok) {
          // Activity log + notify both parties (same as cron path)
          await serviceClient.from("deal_activity_log").insert({
            deal_id: id,
            user_id: null,
            entry_type: "system",
            content:
              "Cancellation request auto-escalated to formal dispute (no response within 72 hours)",
          });

          // Look up deal info for notifications
          const { data: dealForNotify } = await serviceClient
            .from("deals")
            .select(
              "title, deal_link_slug, client_user_id, freelancer_user_id, guest_freelancer_email"
            )
            .eq("id", id)
            .maybeSingle();

          if (dealForNotify) {
            const sharedData = {
              dealTitle: dealForNotify.title,
              dealSlug: dealForNotify.deal_link_slug,
            };

            const partyIds = [
              dealForNotify.client_user_id,
              dealForNotify.freelancer_user_id,
            ].filter(Boolean) as string[];

            for (const partyId of partyIds) {
              const { data: profile } = await serviceClient
                .from("user_profiles")
                .select("email")
                .eq("id", partyId)
                .maybeSingle();
              if (profile?.email) {
                await sendAndLogNotification({
                  supabase: serviceClient,
                  type: "cancellation_auto_escalated",
                  userId: partyId,
                  dealId: id,
                  email: profile.email,
                  data: sharedData,
                });
              }
            }

            if (
              dealForNotify.guest_freelancer_email &&
              !dealForNotify.freelancer_user_id
            ) {
              await sendAndLogNotification({
                supabase: serviceClient,
                type: "cancellation_auto_escalated",
                userId: "guest",
                dealId: id,
                email: dealForNotify.guest_freelancer_email,
                data: sharedData,
              });
            }
          }
        }
      }
    }

    // Now fetch the (possibly updated) list
    const { data: requests } = await serviceClient
      .from("cancellation_requests")
      .select("*")
      .eq("deal_id", id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ ok: true, cancellation_requests: requests || [] });
  }
);
