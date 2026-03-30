import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyAdmin } from "@/lib/api/verifyAdmin";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { updateDisputeStatusSchema } from "@/lib/validation/disputes";

export const PATCH = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const adminCheck = await verifyAdmin();
    if (!adminCheck.ok) return adminCheck.response;

    const body = await req.json();
    const parsed = updateDisputeStatusSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Invalid status" },
        { status: 400 }
      );

    const serviceClient = createServiceClient();

    const { error } = await serviceClient
      .from("disputes")
      .update({ status: parsed.data.status })
      .eq("id", id);

    if (error)
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: error.message },
        { status: 500 }
      );

    return NextResponse.json({ ok: true });
  }
);
