import { NextResponse } from "next/server";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employer/team — List all team members for the current employer.
 * Returns employer_users joined with user_profiles for names/emails.
 */
export const GET = withApiHandler(async function GET() {
  const ctx = await getEmployerForUser();

  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  // Fetch all employer_users for this employer
  const { data: employerUsers, error } = await supabaseAdmin
    .from("employer_users")
    .select("id, user_id, role, invited_by, created_at")
    .eq("employer_id", ctx.employerId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[api/employer/team] Query error:", error.message);
    return NextResponse.json(
      { ok: false, code: "QUERY_FAILED", message: "Failed to load team." },
      { status: 500 }
    );
  }

  // Fetch user profiles for each team member
  const userIds = (employerUsers || []).map((eu) => eu.user_id);
  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name")
    .in("id", userIds.length > 0 ? userIds : ["__none__"]);

  // Fetch auth users for emails
  const members = await Promise.all(
    (employerUsers || []).map(async (eu) => {
      const profile = (profiles || []).find((p) => p.id === eu.user_id);

      // Get email from auth.users via admin API
      let email = "";
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(eu.user_id);
        email = authUser?.user?.email || "";
      } catch {
        // If we can't fetch email, leave it empty
      }

      return {
        id: eu.id,
        user_id: eu.user_id,
        email,
        name: profile?.full_name || null,
        role: eu.role,
        invite_status: "active" as const,
        created_at: eu.created_at,
        is_you: eu.user_id === ctx.userId,
      };
    })
  );

  return NextResponse.json({ ok: true, members });
});

/**
 * POST /api/employer/team — Invite a new team member.
 * Creates an employer_users row with role='poster' (or 'admin').
 * For now, the invited user must already have a CheckHire account.
 * Future: send invite email via Resend.
 */
export const POST = withApiHandler(async function POST(req: Request) {
  const ctx = await getEmployerForUser();

  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  // Only admins can invite
  if (ctx.role !== "admin") {
    return NextResponse.json(
      { ok: false, code: "ADMIN_REQUIRED", message: "Only admins can invite team members." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = (body?.email ?? "").toString().trim().toLowerCase();
  const role = (body?.role ?? "poster").toString();

  if (!email) {
    return NextResponse.json(
      { ok: false, code: "INVALID_EMAIL", message: "Email is required." },
      { status: 400 }
    );
  }

  const validRoles = ["admin", "poster"];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_ROLE", message: "Role must be admin or poster." },
      { status: 400 }
    );
  }

  // Cannot invite yourself
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email?.toLowerCase() === email) {
    return NextResponse.json(
      { ok: false, code: "CANNOT_INVITE_SELF", message: "You cannot invite yourself." },
      { status: 400 }
    );
  }

  // Find user by email in auth.users
  const { data: usersResult } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const targetUser = usersResult?.users?.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (!targetUser) {
    return NextResponse.json(
      {
        ok: false,
        code: "USER_NOT_FOUND",
        message: "No CheckHire account found for this email. They must sign up first.",
      },
      { status: 404 }
    );
  }

  // Check if already a member
  const { data: existing } = await supabaseAdmin
    .from("employer_users")
    .select("id")
    .eq("employer_id", ctx.employerId)
    .eq("user_id", targetUser.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { ok: false, code: "ALREADY_MEMBER", message: "This person is already a team member." },
      { status: 409 }
    );
  }

  // Create employer_users link
  const { error: insertError } = await supabaseAdmin
    .from("employer_users")
    .insert({
      employer_id: ctx.employerId,
      user_id: targetUser.id,
      role,
      invited_by: ctx.userId,
    });

  if (insertError) {
    console.error("[api/employer/team] Insert error:", insertError.message);
    return NextResponse.json(
      { ok: false, code: "INSERT_FAILED", message: "Failed to add team member." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    invite: {
      email,
      role,
      company_name: ctx.employer.company_name,
    },
  });
});
