import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Briefcase, Users, Clock, TrendingUp } from "lucide-react";

export default async function EmployerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch employer info for welcome message
  const { data: employerUser } = await supabase
    .from("employer_users")
    .select("employer_id, employers(company_name)")
    .eq("user_id", user!.id)
    .maybeSingle();

  const employers = employerUser?.employers as
    | { company_name: string }[]
    | { company_name: string }
    | null;
  const companyName =
    (Array.isArray(employers) ? employers[0]?.company_name : employers?.company_name) ??
    "your company";

  const stats = [
    {
      label: "Active Listings",
      value: "0",
      icon: Briefcase,
      color: "text-brand",
      bgColor: "bg-brand-muted",
    },
    {
      label: "Total Applications",
      value: "0",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Avg Response Time",
      value: "—",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Hire Rate",
      value: "—",
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ];

  return (
    <div className="min-h-screen">
      <PageHeader
        title={`Welcome back, ${companyName}`}
        subtitle="Manage your listings and review candidates."
      />

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}
                  >
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">
                      {stat.label}
                    </p>
                    <p className="text-xl font-bold tabular-nums text-slate-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-muted">
            <Briefcase className="h-7 w-7 text-brand" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Post your first verified listing
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Every listing on CheckHire is backed by employer verification. Job
            seekers see your tier badge, salary range, and hiring timeline —
            building trust before they apply.
          </p>
          <a
            href="/employer/listings/new"
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
          >
            <Briefcase className="h-4 w-4" />
            Create Listing
          </a>
        </div>
      </div>
    </div>
  );
}
