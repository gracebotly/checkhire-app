import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import type { CheckinType } from "@/types/database";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Schedules a post-hire check-in for a worker.
 * Creates a row in post_hire_checkins with status 'pending'.
 * The actual email is sent later by a cron job or direct call to sendCheckinEmail.
 *
 * Non-fatal: logs errors but never throws.
 */
export async function scheduleCheckin(
  applicationId: string,
  employerId: string,
  userId: string,
  checkinType: CheckinType
): Promise<void> {
  try {
    const daysFromNow = checkinType === "30day" ? 30 : 60;
    const sendAt = new Date();
    sendAt.setDate(sendAt.getDate() + daysFromNow);

    const { error } = await supabaseAdmin
      .from("post_hire_checkins")
      .insert({
        application_id: applicationId,
        employer_id: employerId,
        user_id: userId,
        checkin_type: checkinType,
        status: "pending",
        sent_at: sendAt.toISOString(),
      });

    if (error) {
      // Unique constraint violation means it's already scheduled — that's fine
      if (error.code === "23505") {
        console.log(
          `[postHireCheckin] ${checkinType} already scheduled for application ${applicationId}`
        );
        return;
      }
      console.error(`[postHireCheckin] Failed to schedule ${checkinType}:`, error.message);
    } else {
      console.log(
        `[postHireCheckin] Scheduled ${checkinType} for application ${applicationId}, send at ${sendAt.toISOString()}`
      );
    }
  } catch (err) {
    console.error(`[postHireCheckin] Error scheduling ${checkinType}:`, err);
  }
}

/**
 * Sends a check-in email to a worker.
 * Called by the cron job when sent_at has passed and status is 'pending'.
 *
 * Non-fatal: logs errors but never throws.
 */
export async function sendCheckinEmail(checkinId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[postHireCheckin] RESEND_API_KEY not set — skipping");
    return;
  }

  try {
    // Fetch the check-in with related data
    const { data: checkin } = await supabaseAdmin
      .from("post_hire_checkins")
      .select("id, application_id, employer_id, user_id, checkin_type")
      .eq("id", checkinId)
      .single();

    if (!checkin) {
      console.error(`[postHireCheckin] Check-in ${checkinId} not found`);
      return;
    }

    // Get worker email from auth
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(checkin.user_id);
    if (!authUser?.user?.email) {
      console.error(`[postHireCheckin] No email for user ${checkin.user_id}`);
      return;
    }

    // Get employer name
    const { data: employer } = await supabaseAdmin
      .from("employers")
      .select("company_name")
      .eq("id", checkin.employer_id)
      .single();

    // Get listing title
    const { data: app } = await supabaseAdmin
      .from("applications")
      .select("job_listing_id")
      .eq("id", checkin.application_id)
      .single();

    let listingTitle = "your position";
    if (app?.job_listing_id) {
      const { data: listing } = await supabaseAdmin
        .from("job_listings")
        .select("title")
        .eq("id", app.job_listing_id)
        .single();
      if (listing) listingTitle = listing.title;
    }

    const companyName = employer?.company_name ?? "your employer";
    const dayLabel = checkin.checkin_type === "30day" ? "30" : "60";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://checkhire.com";
    const checkinUrl = `${baseUrl}/seeker/checkins/${checkinId}`;

    const subject = `${dayLabel}-day check-in: How's your role at ${companyName}?`;
    const body = `Hi there,\n\nIt's been ${dayLabel} days since you were hired for "${listingTitle}" at ${companyName} through CheckHire.\n\nWe'd love a quick check-in to make sure everything is going well. It takes less than 2 minutes:\n\n${checkinUrl}\n\nYour feedback helps us keep CheckHire trustworthy for all job seekers. If something isn't right, we want to know.\n\n— CheckHire`;

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "CheckHire <no-reply@checkhire.com>",
      to: [authUser.user.email],
      subject,
      text: body,
    });

    // Update status to 'sent'
    await supabaseAdmin
      .from("post_hire_checkins")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", checkinId);

    console.log(`[postHireCheckin] Sent ${checkin.checkin_type} email to ${authUser.user.email}`);
  } catch (err) {
    console.error(`[postHireCheckin] Failed to send email for ${checkinId}:`, err);
  }
}

/**
 * Schedules both 30-day and 60-day check-ins for a hire.
 * Convenience function called from the hire flow.
 */
export async function scheduleAllCheckins(
  applicationId: string,
  employerId: string,
  userId: string
): Promise<void> {
  await scheduleCheckin(applicationId, employerId, userId, "30day");
  await scheduleCheckin(applicationId, employerId, userId, "60day");
}
