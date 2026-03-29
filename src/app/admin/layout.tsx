import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, Flag, AlertTriangle, Users, LayoutDashboard } from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/flags", label: "Flag Queue", icon: Flag },
  { href: "/admin/mlm-review", label: "MLM Review", icon: AlertTriangle },
  { href: "/admin/employers", label: "Employers", icon: Users },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_platform_admin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--main-bg))]">
      <div className="border-b border-red-200 bg-red-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-600" />
            <span className="text-sm font-semibold text-red-800">Admin Dashboard</span>
          </div>
          <Link
            href="/"
            className="cursor-pointer text-xs font-medium text-red-600 transition-colors duration-200 hover:text-red-800"
          >
            Exit Admin
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 px-6">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex cursor-pointer items-center gap-1.5 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-600 transition-colors duration-200 hover:border-gray-300 hover:text-slate-900"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
