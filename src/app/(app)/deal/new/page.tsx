import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GigCreateForm } from "@/components/gig/GigCreateForm";
import type { DealTemplate } from "@/types/database";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { template: templateId } = await searchParams;
  let initialTemplate: DealTemplate | null = null;

  if (templateId) {
    const { data } = await supabase
      .from("deal_templates")
      .select("*")
      .eq("id", templateId)
      .eq("user_id", user.id)
      .maybeSingle();
    initialTemplate = data;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-8 text-center font-display text-2xl font-bold text-slate-900">
        Post a Gig
      </h1>
      <GigCreateForm initialTemplate={initialTemplate} />
    </div>
  );
}
