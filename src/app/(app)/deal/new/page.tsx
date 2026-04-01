import { createClient } from "@/lib/supabase/server";
import { GigCreateForm } from "@/components/gig/GigCreateForm";
import type { DealTemplate } from "@/types/database";

type RepeatDealData = {
  title: string;
  description: string;
  deliverables: string | null;
  total_amount: number;
  category: string | null;
};

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; repeat_from?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Auth redirect is handled by middleware — if we got here, user is authenticated
  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-slate-600">Please sign in to create a gig.</p>
      </div>
    );
  }

  const { template: templateId, repeat_from: repeatFromId } =
    await searchParams;

  let initialTemplate: DealTemplate | null = null;
  let initialRepeatData: RepeatDealData | null = null;

  if (templateId) {
    const { data } = await supabase
      .from("deal_templates")
      .select("*")
      .eq("id", templateId)
      .eq("user_id", user.id)
      .maybeSingle();
    initialTemplate = data;
  }

  if (repeatFromId) {
    const { data: originalDeal } = await supabase
      .from("deals")
      .select(
        "title, description, deliverables, total_amount, category, client_user_id, freelancer_user_id"
      )
      .eq("id", repeatFromId)
      .or(`client_user_id.eq.${user.id},freelancer_user_id.eq.${user.id}`)
      .maybeSingle();

    if (originalDeal) {
      initialRepeatData = {
        title: `Follow-up: ${originalDeal.title}`,
        description: originalDeal.description,
        deliverables: originalDeal.deliverables,
        total_amount: originalDeal.total_amount,
        category: originalDeal.category,
      };
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-8 text-center font-display text-2xl font-bold text-slate-900">
        Post a Gig
      </h1>
      <GigCreateForm
        initialTemplate={initialTemplate}
        initialRepeatData={initialRepeatData}
      />
    </div>
  );
}
