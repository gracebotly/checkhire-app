import { createClient } from "@/lib/supabase/server";
import { GigCreateForm } from "@/components/gig/GigCreateForm";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ToastProvider } from "@/components/ui/toast";
import { EmailConfirmBanner } from "@/components/layout/EmailConfirmBanner";
import type { DealTemplate } from "@/types/database";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a Payment Link — CheckHire",
  description:
    "Create an escrow-backed payment link in under 3 minutes. Share it anywhere.",
};

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
  searchParams: Promise<{
    template?: string;
    repeat_from?: string;
    draft?: string;
    category?: string;
    title?: string;
    amount?: string;
    from_wizard?: string;
    other_desc?: string;
    frequency?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/deal/new");

  // Check email verification — block gig creation if not verified
  const emailConfirmed = !!user.email_confirmed_at;

  const {
    template: templateId,
    repeat_from: repeatFromId,
    draft: draftDealId,
    category: wizardCategory,
    title: wizardTitle,
    amount: wizardAmount,
    from_wizard: fromWizard,
    other_desc: wizardOtherDesc,
    frequency: wizardFrequency,
  } = await searchParams;

  let initialTemplate: DealTemplate | null = null;
  let initialRepeatData: RepeatDealData | null = null;
  let initialDraftData: {
    id: string;
    title: string;
    description: string;
    deliverables: string | null;
    total_amount: number;
    category: string | null;
    other_category_description: string | null;
    payment_frequency: string;
    deadline: string | null;
    has_milestones: boolean;
    description_brief_url: string | null;
    deliverables_brief_url: string | null;
    description_brief_name: string | null;
    deliverables_brief_name: string | null;
    screening_questions: unknown[];
  } | null = null;

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

  if (draftDealId) {
    const { data: draftDeal } = await supabase
      .from("deals")
      .select("*")
      .eq("id", draftDealId)
      .eq("client_user_id", user.id)
      .eq("status", "draft")
      .maybeSingle();

    if (draftDeal) {
      initialDraftData = {
        id: draftDeal.id,
        title: draftDeal.title,
        description: draftDeal.description,
        deliverables: draftDeal.deliverables,
        total_amount: draftDeal.total_amount,
        category: draftDeal.category,
        other_category_description: draftDeal.other_category_description,
        payment_frequency: draftDeal.payment_frequency,
        deadline: draftDeal.deadline,
        has_milestones: draftDeal.has_milestones,
        description_brief_url: draftDeal.description_brief_url,
        deliverables_brief_url: draftDeal.deliverables_brief_url,
        description_brief_name: null,
        deliverables_brief_name: null,
        screening_questions: draftDeal.screening_questions || [],
      };
    }
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-white">
        <Navbar />
        <EmailConfirmBanner emailConfirmed={emailConfirmed} userEmail={user.email} />
        <main className="pb-20 md:pb-0">
          {!emailConfirmed ? (
            <div className="mx-auto max-w-4xl px-6 py-10">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Verify your email to create a gig
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Check your inbox for a confirmation link. Once verified, you
                  can create payment links and start getting paid safely.
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl px-6 py-10">
              <h1 className="mb-2 text-center font-display text-2xl font-bold text-slate-900">
                {fromWizard ? "Finish your deal" : "Post a Gig"}
              </h1>
              {fromWizard && (wizardTitle || wizardAmount) && (
                <div className="mx-auto mb-8 max-w-md rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                  {wizardTitle && (
                    <p className="text-sm font-semibold text-slate-900">{wizardTitle}</p>
                  )}
                  {wizardAmount && (
                    <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-brand">
                      ${parseFloat(wizardAmount).toFixed(2)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-600">
                    Fill in the details below to publish your deal link
                  </p>
                </div>
              )}
              {!fromWizard && <div className="mb-8" />}
              <GigCreateForm
                initialTemplate={initialTemplate}
                initialRepeatData={initialRepeatData}
                initialDraft={initialDraftData}
                wizardData={
                  fromWizard
                    ? {
                        category: wizardCategory || null,
                        title: wizardTitle || null,
                        amount: wizardAmount || null,
                        otherDescription: wizardOtherDesc || null,
                        frequency: wizardFrequency || null,
                      }
                    : null
                }
              />
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
