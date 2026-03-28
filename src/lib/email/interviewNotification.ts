import { Resend } from "resend";

type InterviewEventType =
  | "interview_requested"
  | "interview_accepted"
  | "interview_declined"
  | "interview_confirmed"
  | "interview_scheduled";

interface InterviewNotificationParams {
  to: string;
  recipientName: string | null;
  listingTitle: string;
  companyName: string;
  candidateLabel: string; // pseudonym or first name
  eventType: InterviewEventType;
  applicationId: string;
  baseUrl?: string;
}

const SUBJECTS: Record<InterviewEventType, (p: InterviewNotificationParams) => string> = {
  interview_requested: (p) => `Interview request for: ${p.listingTitle}`,
  interview_accepted: (p) => `${p.candidateLabel} accepted your interview request`,
  interview_declined: (p) => `Interview declined for: ${p.listingTitle}`,
  interview_confirmed: (p) => `Interview confirmed — full profile now visible`,
  interview_scheduled: (p) => `Interview times proposed for: ${p.listingTitle}`,
};

const BODIES: Record<InterviewEventType, (p: InterviewNotificationParams) => string> = {
  interview_requested: (p) => {
    const greeting = p.recipientName ? `Hi ${p.recipientName},` : "Hi there,";
    return `${greeting}

${p.companyName} would like to schedule an interview with you for "${p.listingTitle}".

Please log in to CheckHire to accept or decline this request. Accepting will share your first name with the employer — your last name, email, and phone remain private.

— CheckHire`;
  },
  interview_accepted: (p) => {
    const greeting = p.recipientName ? `Hi ${p.recipientName},` : "Hi there,";
    return `${greeting}

Great news — ${p.candidateLabel} has accepted your interview request for "${p.listingTitle}".

Their first name is now visible in your dashboard. You can now schedule interview times through the platform.

— CheckHire`;
  },
  interview_declined: (p) => {
    const greeting = p.recipientName ? `Hi ${p.recipientName},` : "Hi there,";
    return `${greeting}

${p.candidateLabel} has declined your interview request for "${p.listingTitle}".

You can continue reviewing other candidates in your dashboard.

— CheckHire`;
  },
  interview_confirmed: (p) => {
    const greeting = p.recipientName ? `Hi ${p.recipientName},` : "Hi there,";
    return `${greeting}

The interview for "${p.listingTitle}" has been confirmed as completed. The candidate's full name and resume are now accessible in your dashboard.

— CheckHire`;
  },
  interview_scheduled: (p) => {
    const greeting = p.recipientName ? `Hi ${p.recipientName},` : "Hi there,";
    return `${greeting}

${p.companyName} has proposed interview times for "${p.listingTitle}". Please log in to CheckHire to select your preferred time slot.

— CheckHire`;
  },
};

/**
 * Sends interview-related notification emails.
 * Non-fatal: logs errors but never throws.
 */
export async function sendInterviewNotification(params: InterviewNotificationParams) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[interviewNotification] RESEND_API_KEY not set — skipping");
    return;
  }

  const resend = new Resend(apiKey);
  const subject = SUBJECTS[params.eventType](params);
  const body = BODIES[params.eventType](params);

  try {
    await resend.emails.send({
      from: "CheckHire <no-reply@checkhire.com>",
      to: [params.to],
      subject,
      text: body,
    });
    console.log(`[interviewNotification] Sent ${params.eventType} to ${params.to}`);
  } catch (err) {
    console.error("[interviewNotification] Failed:", err);
  }
}
