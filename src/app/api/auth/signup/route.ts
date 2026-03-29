import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const EMAIL_RE =
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function siteUrl(req: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.startsWith("http")) return env;
  return new URL(req.url).origin;
}

export const POST = withApiHandler(async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const name = (body?.name ?? "").toString().trim();
  const email = (body?.email ?? "").toString().trim().toLowerCase();
  const password = (body?.password ?? "").toString();
  const userType = (body?.user_type ?? "job_seeker").toString();
  const validUserType = userType === "employer" ? "employer" : "job_seeker";
  const companyName = (body?.company_name ?? "").toString().trim();

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, message: "Email and password are required." },
      { status: 400 }
    );
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, message: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, message: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  // Employer-specific validation
  if (validUserType === "employer" && !companyName) {
    return NextResponse.json(
      { ok: false, message: "Company name is required for employer accounts." },
      { status: 400 }
    );
  }

  // Build redirect URL with company_name for the callback
  const params = new URLSearchParams({
    intent: "signup",
    user_type: validUserType,
  });
  if (validUserType === "employer" && companyName) {
    params.set("company_name", companyName);
  }
  const redirectTo = `${siteUrl(req)}/auth/callback?${params.toString()}`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        user_type: validUserType,
        ...(validUserType === "employer" && companyName
          ? { company_name: companyName }
          : {}),
      },
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    console.error("[auth/signup] Supabase error", {
      message: error.message,
      name: error.name,
      redirectTo,
    });

    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 400 }
    );
  }

  // ─── Duplicate company name alert ───
  // If an employer signs up with a name matching an existing company, flag it.
  // This does NOT block signup — it alerts the existing admin.
  if (validUserType === "employer" && companyName) {
    try {
      const normalizedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const { data: existingEmployers } = await supabaseAdmin
        .from("employers")
        .select("id, company_name, claimed_by")
        .limit(50);

      if (existingEmployers) {
        const match = existingEmployers.find(
          (e) => e.company_name.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedName
        );

        if (match) {
          // Create a flag against the NEW signup (we don't have their employer ID yet,
          // so we flag against the existing employer as target with a system note)
          await supabaseAdmin.from("flags").insert({
            reporter_id: null, // system-generated
            reporter_type: "system",
            target_type: "employer",
            target_id: match.id,
            reason: "impersonation",
            description: `A new account signed up with company name "${companyName}" which matches existing company "${match.company_name}". New signup email: ${email}. This may be a legitimate second user or an impersonation attempt.`,
            severity_weight: 2,
          });

          console.log(
            `[signup] Duplicate company alert: "${companyName}" matches existing employer ${match.id}`
          );
        }
      }
    } catch (err) {
      // Non-fatal — never block signup for a flagging failure
      console.error("[signup] Duplicate company check error:", err);
    }
  }

  return NextResponse.json({ ok: true, hasSession: Boolean(data?.session) });
});
