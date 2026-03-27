import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;

  if (params.error || params.error_code) {
    redirect("/login?error=auth_failed");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Route based on user_type
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("user_type")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.user_type === "employer") {
      redirect("/employer/dashboard");
    }
    redirect("/jobs");
  }

  redirect("/login");
}
