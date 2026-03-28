import { NextRequest, NextResponse } from "next/server";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PATCH /api/employer/team/[memberId] — Change a team member's role.
 * Admin only. Cannot change your own role.
 */
export const PATCH = withApiHandler(async function PATCH(
  req: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const ctx = await getEmployerForUser();

  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  if (ctx.role !== "admin") {
    return NextResponse.json(
      { ok: false, code: "ADMIN_REQUIRED", message: "Only admins can change roles." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const newRole = (body?.role ?? "").toString();

  const validRoles = ["admin", "poster"];
  if (!validRoles.includes(newRole)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_ROLE", message: "Role must be admin or poster." },
      { status: 400 }
    );
  }

  // Fetch the target member
  const { data: targetMember } = await supabaseAdmin
    .from("employer_users")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("employer_id", ctx.employerId)
    .maybeSingle();

  if (!targetMember) {
    return NextResponse.json(
      { ok: false, code: "MEMBER_NOT_FOUND", message: "Team member not found." },
      { status: 404 }
    );
  }

  // Cannot change your own role
  if (targetMember.user_id === ctx.userId) {
    return NextResponse.json(
      { ok: false, code: "CANNOT_CHANGE_OWN_ROLE", message: "You cannot change your own role." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("employer_users")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("employer_id", ctx.employerId);

  if (error) {
    console.error("[api/employer/team/member] Update error:", error.message);
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to update role." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
});

/**
 * DELETE /api/employer/team/[memberId] — Remove a team member.
 * Admin only. Cannot remove yourself. Cannot remove the last admin.
 */
export const DELETE = withApiHandler(async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const ctx = await getEmployerForUser();

  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  if (ctx.role !== "admin") {
    return NextResponse.json(
      { ok: false, code: "ADMIN_REQUIRED", message: "Only admins can remove team members." },
      { status: 403 }
    );
  }

  // Fetch the target member
  const { data: targetMember } = await supabaseAdmin
    .from("employer_users")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("employer_id", ctx.employerId)
    .maybeSingle();

  if (!targetMember) {
    return NextResponse.json(
      { ok: false, code: "MEMBER_NOT_FOUND", message: "Team member not found." },
      { status: 404 }
    );
  }

  // Cannot remove yourself
  if (targetMember.user_id === ctx.userId) {
    return NextResponse.json(
      { ok: false, code: "CANNOT_REMOVE_SELF", message: "You cannot remove yourself." },
      { status: 400 }
    );
  }

  // If removing an admin, check we aren't removing the last one
  if (targetMember.role === "admin") {
    const { count } = await supabaseAdmin
      .from("employer_users")
      .select("id", { count: "exact", head: true })
      .eq("employer_id", ctx.employerId)
      .eq("role", "admin");

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { ok: false, code: "LAST_ADMIN", message: "Cannot remove the only admin." },
        { status: 400 }
      );
    }
  }

  const { error } = await supabaseAdmin
    .from("employer_users")
    .delete()
    .eq("id", memberId)
    .eq("employer_id", ctx.employerId);

  if (error) {
    console.error("[api/employer/team/member] Delete error:", error.message);
    return NextResponse.json(
      { ok: false, code: "DELETE_FAILED", message: "Failed to remove team member." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
});
