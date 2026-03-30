import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Shield, ArrowLeft } from "lucide-react";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_platform_admin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-brand" />
            <span className="font-display text-lg font-bold text-slate-900">
              CheckHire Admin
            </span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
