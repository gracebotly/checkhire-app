import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AuditActionType =
  | "candidate_view"
  | "interview_request"
  | "message_sent"
  | "stage_advance"
  | "resume_access";

/**
 * Logs an employer action on candidate data to the access_audit_log table.
 *
 * This is the centralized audit logging function — every employer API route
 * that touches candidate data MUST call this.
 *
 * @param employerId - The employer's company ID
 * @param employerUserId - The individual user performing the action
 * @param actionType - What kind of access is being performed
 * @param applicationId - Which application is being accessed (null for bulk views)
 * @param disclosureLevel - The disclosure level at the time of access
 * @param req - The incoming Request object (for IP and user-agent extraction)
 */
export async function logCandidateAccess(
  employerId: string,
  employerUserId: string,
  actionType: AuditActionType,
  applicationId: string | null,
  disclosureLevel: number,
  req: Request
): Promise<void> {
  try {
    await supabaseAdmin.from("access_audit_log").insert({
      employer_id: employerId,
      employer_user_id: employerUserId,
      action_type: actionType,
      application_id: applicationId,
      disclosure_level_at_time: disclosureLevel,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      user_agent: req.headers.get("user-agent") || null,
    });
  } catch (err) {
    // Audit logging should never block the request — log and continue
    console.error("[auditLog] Failed to log access:", err);
  }
}
