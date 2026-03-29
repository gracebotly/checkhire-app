import { PageHeader } from "@/components/layout/page-header";
import { DataControlsCard } from "@/components/seeker/DataControlsCard";
import { FlagStatusCard } from "@/components/seeker/FlagStatusCard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SeekerSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <PageHeader title="Settings" subtitle="Account settings and data controls." />
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <DataControlsCard />
        <FlagStatusCard />
      </div>
    </div>
  );
}
