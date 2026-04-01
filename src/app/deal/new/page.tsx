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
    category: wizardCategory,
    title: wizardTitle,
    amount: wizardAmount,
    from_wizard: fromWizard,
    other_desc: wizardOtherDesc,
    frequency: wizardFrequency,
  } = await searchParams;

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
    <ToastProvider>
      <div className="min-h-screen bg-white">
        <Navbar />
        <EmailConfirmBanner emailConfirmed={emailConfirmed} />
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
              <h1 className="mb-8 text-center font-display text-2xl font-bold text-slate-900">
                {fromWizard ? "Finish Your Payment Link" : "Create a Payment Link"}
              </h1>
              <GigCreateForm
                initialTemplate={initialTemplate}
                initialRepeatData={initialRepeatData}
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
