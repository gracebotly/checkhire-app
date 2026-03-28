import { withApiHandler } from "@/lib/api/withApiHandler";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { logCandidateAccess } from "@/lib/api/auditLog";
import { createSystemMessage } from "@/lib/chat/systemMessage";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const scheduleSchema = z.object({
  proposed_slots: z
    .array(
      z.object({
        datetime: z.string().min(1, "Slot datetime is required"),
        duration_minutes: z.number().min(15).max(480),
      })
    )
    .min(1, "At least one time slot is required")
    .max(5, "Maximum 5 time slots"),
  video_call_link: z.string().url("Must be a valid URL").optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  timezone_employer: z.string().optional().nullable(),
});

/**
 * POST /api/employer/applications/[id]/schedule-interview
 *
 * Employer proposes time slots for an interview.
 * - Creates an interview_schedules row
 * - Creates a system message in the chat with the schedule details
 * - Does NOT change application status (that happens via the status endpoint)
 */
export const POST = withApiHandler(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getEmployerForUser();
  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = scheduleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message || "Invalid schedule data.",
      },
      { status: 400 }
    );
  }

  // Verify application belongs to this employer's listing
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, job_listing_id, status, pseudonym")
    .eq("id", id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Application not found." },
      { status: 404 }
    );
  }

  const { data: listing } = await supabaseAdmin
    .from("job_listings")
    .select("id, employer_id, title")
    .eq("id", application.job_listing_id)
    .eq("employer_id", ctx.employerId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json(
      { ok: false, code: "NOT_AUTHORIZED", message: "This application is not on your listing." },
      { status: 403 }
    );
  }

  // Application should be in interview_requested or interview_accepted
  if (!["interview_requested", "interview_accepted"].includes(application.status)) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_STATUS",
        message: "Can only schedule interviews for applications in interview stage.",
      },
      { status: 400 }
    );
  }

  const { proposed_slots, video_call_link, notes, timezone_employer } = parsed.data;

  // Create interview schedule
  const { data: schedule, error: insertError } = await supabaseAdmin
    .from("interview_schedules")
    .insert({
      application_id: id,
      proposed_by: ctx.userId,
      proposed_slots,
      video_call_link: video_call_link || null,
      notes: notes || null,
      timezone_employer: timezone_employer || null,
      status: "pending",
    })
    .select("id, created_at")
    .single();

  if (insertError) {
    console.error("[schedule-interview] Insert error:", insertError.message);
    return NextResponse.json(
      { ok: false, code: "INSERT_FAILED", message: "Failed to create interview schedule." },
      { status: 500 }
    );
  }

  // Create system message with schedule details
  const slotCount = proposed_slots.length;
  await createSystemMessage(
    id,
    `Interview schedule proposed with ${slotCount} time slot${slotCount > 1 ? "s" : ""}. Please select your preferred time.`,
    "interview_scheduled",
    {
      schedule_id: schedule.id,
      proposed_slots,
      video_call_link: video_call_link || null,
      notes: notes || null,
    }
  );

  // Audit log
  await logCandidateAccess(
    ctx.employerId,
    ctx.userId,
    "interview_request",
    id,
    2, // should be at disclosure level 2 by this point
    req
  );

  return NextResponse.json({
    ok: true,
    schedule_id: schedule.id,
  });
});
