import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type AdminCheckResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

export async function verifyAdmin(): Promise<AdminCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  // Use service client to check admin status (bypasses RLS)
  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_platform_admin) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: user.id };
}
