import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheckinForm } from "./checkin-form";

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the check-in — RLS ensures only the owner can see it
  const { data: checkin } = await supabase
    .from("post_hire_checkins")
    .select(
      `id, checkin_type, status, responded_at,
       employer_id,
       applications (
         job_listing_id,
         job_listings (
           title,
           job_type,
           employers (
             company_name
           )
         )
       )`
    )
    .eq("id", id)
    .maybeSingle();

  if (!checkin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-900">Check-in not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            This check-in link may have expired or is not associated with your account.
          </p>
        </div>
      </div>
    );
  }

  // Type-safe extraction of nested joins
  const appData = Array.isArray(checkin.applications)
    ? ((checkin.applications[0] as unknown as Record<string, unknown> | undefined) ?? null)
    : (checkin.applications as unknown as Record<string, unknown> | null);

  const appListings = appData?.job_listings;
  const listingData = Array.isArray(appListings)
    ? ((appListings[0] as Record<string, unknown> | undefined) ?? null)
    : ((appListings as Record<string, unknown> | undefined) ?? null);

  const listingEmployers = listingData?.employers;
  const employerData = Array.isArray(listingEmployers)
    ? ((listingEmployers[0] as Record<string, unknown> | undefined) ?? null)
    : ((listingEmployers as Record<string, unknown> | undefined) ?? null);

  const listingTitle = (listingData?.title as string) ?? "your position";
  const companyName = (employerData?.company_name as string) ?? "your employer";
  const jobType = (listingData?.job_type as string) ?? "full_time";
  const isGig = jobType === "gig" || jobType === "temp";
  const dayLabel = checkin.checkin_type === "30day" ? "30" : "60";

  if (checkin.status === "responded") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-900">Already submitted</h1>
          <p className="mt-2 text-sm text-slate-600">
            You already responded to this {dayLabel}-day check-in. Thank you for your feedback!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <CheckinForm
        checkinId={checkin.id}
        checkinType={checkin.checkin_type}
        listingTitle={listingTitle}
        companyName={companyName}
        showGotPaid={isGig}
      />
    </div>
  );
}
