import { withApiHandler } from "@/lib/api/withApiHandler";
import { createSystemMessage } from "@/lib/chat/systemMessage";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const selectSlotSchema = z.object({
  schedule_id: z.string().uuid("Invalid schedule ID"),
  selected_slot: z.object({
    datetime: z.string().min(1),
    duration_minutes: z.number().min(15).max(480),
  }),
  timezone_candidate: z.string().optional().nullable(),
});

/**
 * POST /api/applications/[id]/select-slot
 *
 * Candidate selects a time slot from proposed options.
 * Updates interview_schedules with the selection.
 * Creates a system message confirming the interview time.
 */
export const POST = withApiHandler(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = selectSlotSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message || "Invalid slot selection.",
      },
      { status: 400 }
    );
  }

  // Verify application belongs to this candidate
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!application || application.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, code: "NOT_AUTHORIZED", message: "This is not your application." },
      { status: 403 }
    );
  }

  const { schedule_id, selected_slot, timezone_candidate } = parsed.data;

  // Verify the schedule exists and belongs to this application
  const { data: schedule } = await supabaseAdmin
    .from("interview_schedules")
    .select("id, status, proposed_slots")
    .eq("id", schedule_id)
    .eq("application_id", id)
    .maybeSingle();

  if (!schedule) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Interview schedule not found." },
      { status: 404 }
    );
  }

  if (schedule.status !== "pending") {
    return NextResponse.json(
      { ok: false, code: "ALREADY_RESPONDED", message: "This schedule has already been responded to." },
      { status: 400 }
    );
  }

  // Update schedule with selection
  const { error: updateError } = await supabaseAdmin
    .from("interview_schedules")
    .update({
      selected_slot,
      timezone_candidate: timezone_candidate || null,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", schedule_id);

  if (updateError) {
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to select time slot." },
      { status: 500 }
    );
  }

  // Format the selected time for the system message
  const selectedDate = new Date(selected_slot.datetime);
  const timeStr = selectedDate.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  await createSystemMessage(
    id,
    `Interview time confirmed: ${timeStr} (${selected_slot.duration_minutes} minutes).`,
    "slot_selected",
    { schedule_id, selected_slot }
  );

  return NextResponse.json({ ok: true, selected_slot });
});
