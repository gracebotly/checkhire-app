import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyAdmin } from "@/lib/api/verifyAdmin";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { suspendUserSchema } from "@/lib/validation/disputes";
import { sendDealNotification } from "@/lib/email/notifications";
import { sendAndLogNotification } from "@/lib/email/logNotification";

export const PATCH = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const adminCheck = await verifyAdmin();
    if (!adminCheck.ok) return adminCheck.response;

    const body = await req.json();
    const parsed = suspendUserSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Invalid action" },
        { status: 400 }
      );

    const serviceClient = createServiceClient();

    // Don't allow suspending yourself
    if (id === adminCheck.userId)
      return NextResponse.json(
        { ok: false, code: "SELF_SUSPEND", message: "Cannot suspend yourself" },
        { status: 400 }
      );

    const suspended = parsed.data.action === "suspend";
    const reason = parsed.data.reason;

    // ── Layer 1: Supabase Auth ban ──
    if (suspended) {
      const { error: banError } = await serviceClient.auth.admin.updateUserById(
        id,
        { ban_duration: "876000h" }
      );
      if (banError) {
        console.error("[suspend] Auth ban failed:", banError);
        return NextResponse.json(
          { ok: false, code: "AUTH_BAN_FAILED", message: "Failed to ban user at auth level" },
          { status: 500 }
        );
      }
    } else {
      const { error: unbanError } = await serviceClient.auth.admin.updateUserById(
        id,
        { ban_duration: "none" }
      );
      if (unbanError) {
        console.error("[unsuspend] Auth unban failed:", unbanError);
        return NextResponse.json(
          { ok: false, code: "AUTH_UNBAN_FAILED", message: "Failed to lift user ban at auth level" },
          { status: 500 }
        );
      }
    }

    // ── Layer 2: Profile flag ──
    const { error: profileError } = await serviceClient
      .from("user_profiles")
      .update({ suspended })
      .eq("id", id);

    if (profileError) {
      console.error("[suspend] Profile update failed, attempting auth rollback:", profileError);
      await serviceClient.auth.admin.updateUserById(
        id,
        { ban_duration: suspended ? "none" : "876000h" }
      ).catch((e: unknown) => console.error("[suspend] Auth rollback also failed:", e));

      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: profileError.message },
        { status: 500 }
      );
    }

    // ── Layer 3: Hide/freeze all active deals ──
    let dealsCancelled = 0;
    let dealsFrozen = 0;

    if (suspended) {
      // Cancel all deals where this user is the client AND no freelancer is attached
      // (unfunded or pending acceptance — safe to cancel outright)
      const { data: cancelledDeals } = await serviceClient
        .from("deals")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("client_user_id", id)
        .is("freelancer_user_id", null)
        .in("status", ["draft", "pending_acceptance"])
        .select("id, title, deal_link_slug");

      if (cancelledDeals) {
        dealsCancelled = cancelledDeals.length;
        // Add system log to each cancelled deal
        for (const d of cancelledDeals) {
          await serviceClient.from("deal_activity_log").insert({
            deal_id: d.id,
            user_id: null,
            entry_type: "system",
            content: "This gig was removed because the poster's account has been suspended.",
          });
        }
      }

      // Freeze deals where this user is client AND a freelancer IS attached
      // (could have work in progress — needs manual admin review)
      const { data: frozenClientDeals } = await serviceClient
        .from("deals")
        .update({
          status: "disputed",
          escrow_status: "frozen",
          auto_release_at: null,
          flagged_for_review: true,
          flagged_reason: "Client account suspended — manual review required",
        })
        .eq("client_user_id", id)
        .not("freelancer_user_id", "is", null)
        .in("status", ["funded", "in_progress", "submitted", "revision_requested"])
        .select("id, title, deal_link_slug, freelancer_user_id, guest_freelancer_email");

      if (frozenClientDeals) {
        dealsFrozen += frozenClientDeals.length;
        for (const d of frozenClientDeals) {
          await serviceClient.from("deal_activity_log").insert({
            deal_id: d.id,
            user_id: null,
            entry_type: "system",
            content: "This gig has been paused — the client's account has been suspended. CheckHire is reviewing the situation.",
          });

          // Notify the freelancer that the deal is frozen
          if (d.freelancer_user_id) {
            const { data: fp } = await serviceClient
              .from("user_profiles")
              .select("email")
              .eq("id", d.freelancer_user_id)
              .maybeSingle();
            if (fp?.email) {
              await sendAndLogNotification({
                supabase: serviceClient,
                type: "dispute_opened",
                userId: d.freelancer_user_id,
                dealId: d.id,
                email: fp.email,
                data: {
                  dealTitle: d.title,
                  dealSlug: d.deal_link_slug,
                  otherPartyName: "CheckHire Safety Team",
                },
              }).catch((err: unknown) => console.error("[suspend] Failed to notify freelancer:", err));
            }
          } else if (d.guest_freelancer_email) {
            await sendAndLogNotification({
              supabase: serviceClient,
              type: "dispute_opened",
              userId: "guest",
              dealId: d.id,
              email: d.guest_freelancer_email,
              data: {
                dealTitle: d.title,
                dealSlug: d.deal_link_slug,
                otherPartyName: "CheckHire Safety Team",
              },
            }).catch((err: unknown) => console.error("[suspend] Failed to notify guest freelancer:", err));
          }
        }
      }

      // Freeze deals where this user is the freelancer
      const { data: frozenFreelancerDeals } = await serviceClient
        .from("deals")
        .update({
          status: "disputed",
          escrow_status: "frozen",
          auto_release_at: null,
          flagged_for_review: true,
          flagged_reason: "Freelancer account suspended — manual review required",
        })
        .eq("freelancer_user_id", id)
        .in("status", ["funded", "in_progress", "submitted", "revision_requested"])
        .select("id, title, deal_link_slug, client_user_id");

      if (frozenFreelancerDeals) {
        dealsFrozen += frozenFreelancerDeals.length;
        for (const d of frozenFreelancerDeals) {
          await serviceClient.from("deal_activity_log").insert({
            deal_id: d.id,
            user_id: null,
            entry_type: "system",
            content: "This gig has been paused — the freelancer's account has been suspended. CheckHire is reviewing the situation.",
          });

          // Notify the client
          const { data: cp } = await serviceClient
            .from("user_profiles")
            .select("email")
            .eq("id", d.client_user_id)
            .maybeSingle();
          if (cp?.email) {
            await sendAndLogNotification({
              supabase: serviceClient,
              type: "dispute_opened",
              userId: d.client_user_id,
              dealId: d.id,
              email: cp.email,
              data: {
                dealTitle: d.title,
                dealSlug: d.deal_link_slug,
                otherPartyName: "CheckHire Safety Team",
              },
            }).catch((err: unknown) => console.error("[suspend] Failed to notify client:", err));
          }
        }
      }

      // Also null out any auto_release_at on milestones for frozen deals
      if (frozenClientDeals?.length || frozenFreelancerDeals?.length) {
        const frozenDealIds = [
          ...(frozenClientDeals || []).map((d) => d.id),
          ...(frozenFreelancerDeals || []).map((d) => d.id),
        ];
        await serviceClient
          .from("milestones")
          .update({ auto_release_at: null })
          .in("deal_id", frozenDealIds)
          .not("auto_release_at", "is", null);
      }
    }
    // NOTE: Unsuspend does NOT restore cancelled/frozen deals.
    // The user must re-create deals. Frozen deals with freelancers need manual admin review.

    // ── Send email notification (non-blocking) ──
    const { data: userProfile } = await serviceClient
      .from("user_profiles")
      .select("email, display_name")
      .eq("id", id)
      .maybeSingle();

    let emailSent = false;

    if (userProfile?.email) {
      const notificationType = suspended
        ? ("account_suspended" as const)
        : ("account_unsuspended" as const);

      sendDealNotification({
        type: notificationType,
        to: userProfile.email,
        data: {
          dealTitle: "",
          dealSlug: "",
          displayName: userProfile.display_name || undefined,
          suspensionReason: reason || undefined,
        },
      })
        .then((sent) => {
          if (!sent) console.error(`[suspend] Email send returned false for user ${id}`);
        })
        .catch((err) =>
          console.error(`[suspend] Email error for user ${id}:`, err)
        );

      emailSent = true;

      // Log the notification
      const { error: emailLogError } = await serviceClient
        .from("email_notifications")
        .insert({
          user_id: id,
          deal_id: null,
          notification_type: notificationType,
          email_address: userProfile.email,
          sent_at: new Date().toISOString(),
        });
      if (emailLogError) {
        console.error("[suspend] Failed to log notification:", emailLogError);
      }
    }

    return NextResponse.json({
      ok: true,
      suspended,
      emailSent,
      dealsCancelled,
      dealsFrozen,
    });
  }
);
