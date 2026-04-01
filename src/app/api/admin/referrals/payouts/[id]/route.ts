import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { z } from "zod";

const updatePayoutSchema = z.object({
  status: z.enum(["completed", "failed"]),
  notes: z.string().optional(),
});

export const PATCH = withApiHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_platform_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_platform_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updatePayoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const serviceClient = createServiceClient();

    const { data: payout } = await serviceClient
      .from("referral_payouts")
      .select("*")
      .eq("id", id)
      .single();

    if (!payout) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    }

    if (payout.status !== "pending") {
      return NextResponse.json(
        { error: "Payout already processed" },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    };

    if (parsed.data.status === "completed") {
      updateData.completed_at = new Date().toISOString();

      await serviceClient
        .from("referral_earnings")
        .update({ status: "paid_out", paid_out_at: new Date().toISOString() })
        .eq("referrer_user_id", payout.user_id)
        .eq("status", "credited");
    }

    const { error: updateError } = await serviceClient
      .from("referral_payouts")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update payout" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, status: parsed.data.status });
  },
);
