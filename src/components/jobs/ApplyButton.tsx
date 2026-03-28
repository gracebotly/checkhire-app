"use client";

import { AlertCircle, Briefcase, LogIn } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ApplyModal } from "./ApplyModal";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { ScreeningQuestion } from "@/types/database";

interface ApplyButtonProps {
  listingId: string;
  listingTitle: string;
  requiresScreeningQuiz: boolean;
  screeningQuestions: ScreeningQuestion[];
  applicationsClosed: boolean;
}

export function ApplyButton({
  listingId,
  listingTitle,
  requiresScreeningQuiz,
  screeningQuestions,
  applicationsClosed,
}: ApplyButtonProps) {
  const [userState, setUserState] = useState<
    "loading" | "anon" | "employer" | "seeker"
  >("loading");
  const [showModal, setShowModal] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [appliedPseudonym, setAppliedPseudonym] = useState<string | null>(null);

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserState("anon");
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("user_type")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.user_type === "employer") {
        setUserState("employer");
        return;
      }

      setUserState("seeker");

      const { data: existing } = await supabase
        .from("applications")
        .select("id, pseudonym")
        .eq("job_listing_id", listingId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        setAlreadyApplied(true);
        setAppliedPseudonym(existing.pseudonym);
      }
    }

    checkUser();
  }, [listingId]);

  if (applicationsClosed) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-6 py-3 text-sm font-semibold text-slate-600">
          <AlertCircle className="h-4 w-4" />
          Applications closed
        </div>
      </div>
    );
  }

  if (userState === "loading") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-50 px-6 py-3 text-sm text-slate-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          Loading...
        </div>
      </div>
    );
  }

  if (alreadyApplied) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <Briefcase className="h-4 w-4" />
            You&apos;ve applied
          </div>
          {appliedPseudonym && (
            <p className="text-xs text-emerald-800">
              Your pseudonym: <span className="font-semibold">{appliedPseudonym}</span>
            </p>
          )}
          <Link
            href="/seeker/applications"
            className="mt-1 cursor-pointer text-xs font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
          >
            View my applications
          </Link>
        </div>
      </div>
    );
  }

  if (userState === "anon") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <Link
          href="/signup"
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
        >
          <LogIn className="h-4 w-4" />
          Sign up to apply
        </Link>
        <p className="mt-2 text-center text-xs text-slate-600">
          Apply anonymously with a pseudonym
        </p>
      </div>
    );
  }

  if (userState === "employer") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-50 px-6 py-3 text-sm text-slate-600">
          <AlertCircle className="h-4 w-4" />
          Employer accounts cannot apply
        </div>
        <p className="mt-2 text-center text-xs text-slate-600">
          Sign in with a job seeker account to apply.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <Button
          type="button"
          onClick={() => setShowModal(true)}
          className="w-full cursor-pointer bg-brand text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover"
        >
          <Briefcase className="h-4 w-4" />
          Apply Now
        </Button>
        <p className="mt-2 text-center text-xs text-slate-600">
          You&apos;ll apply anonymously with a pseudonym
        </p>
      </div>

      <ApplyModal
        listingId={listingId}
        listingTitle={listingTitle}
        requiresScreeningQuiz={requiresScreeningQuiz}
        screeningQuestions={screeningQuestions}
        open={showModal}
        onOpenChange={setShowModal}
        onSuccess={(pseudonym) => {
          setShowModal(false);
          setAlreadyApplied(true);
          setAppliedPseudonym(pseudonym);
        }}
      />
    </>
  );
}
