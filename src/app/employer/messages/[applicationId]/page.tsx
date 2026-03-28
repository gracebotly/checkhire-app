"use client";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { ApplicationStatus, DisclosureLevel } from "@/types/database";

type ChatContext = {
  pseudonym: string;
  first_name?: string;
  full_name?: string;
  disclosure_level: DisclosureLevel;
  status: ApplicationStatus;
  listing_title: string;
  company_name: string;
  current_user_id: string;
};

export default function EmployerChatPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = use(params);
  const [ctx, setCtx] = useState<ChatContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Fetch thread context from threads API
        const threadsRes = await fetch("/api/messages/threads");
        const threadsData = await threadsRes.json();

        if (!threadsData.ok) {
          setError("Failed to load conversation.");
          return;
        }

        const thread = (threadsData.threads || []).find(
          (t: { application_id: string }) => t.application_id === applicationId
        );

        // Get current user
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setError("Not authenticated.");
          return;
        }

        if (thread) {
          setCtx({
            pseudonym: thread.pseudonym,
            first_name: thread.first_name,
            full_name: thread.full_name,
            disclosure_level: thread.disclosure_level,
            status: thread.status,
            listing_title: thread.listing_title,
            company_name: thread.company_name,
            current_user_id: user.id,
          });
        } else {
          // No thread yet (no messages exchanged). Fetch application context directly.
          const { data: appRecord } = await supabase
            .from("applications")
            .select(`
              pseudonym, disclosure_level, status,
              job_listings ( title, slug, employers ( company_name, tier_level ) )
            `)
            .eq("id", applicationId)
            .maybeSingle();

          if (appRecord) {
            const appListing = Array.isArray(appRecord.job_listings)
              ? appRecord.job_listings[0]
              : appRecord.job_listings;
            const appEmployer = appListing?.employers
              ? Array.isArray(appListing.employers) ? appListing.employers[0] : appListing.employers
              : null;

            setCtx({
              pseudonym: appRecord.pseudonym || "Candidate",
              first_name: undefined,
              full_name: undefined,
              disclosure_level: (appRecord.disclosure_level || 1) as 1 | 2 | 3,
              status: (appRecord.status || "applied") as ApplicationStatus,
              listing_title: appListing?.title || "",
              company_name: appEmployer?.company_name || "",
              current_user_id: user.id,
            });
          } else {
            setCtx({
              pseudonym: "Candidate",
              disclosure_level: 1,
              status: "applied",
              listing_title: "",
              company_name: "",
              current_user_id: user.id,
            });
          }
        }
      } catch {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [applicationId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
      </div>
    );
  }

  if (error || !ctx) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Messages" />
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
            {error || "Conversation not found."}
          </div>
        </div>
      </div>
    );
  }

  // Determine display name based on disclosure level
  let displayName = ctx.pseudonym;
  if (ctx.disclosure_level >= 3 && ctx.full_name) {
    displayName = ctx.full_name;
  } else if (ctx.disclosure_level >= 2 && ctx.first_name) {
    displayName = ctx.first_name;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/employer/messages"
            className="cursor-pointer text-slate-600 transition-colors duration-200 hover:text-slate-900"
            aria-label="Back to messages"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-brand" />
              <h1 className="truncate text-sm font-semibold text-slate-900">
                {displayName}
              </h1>
              <span className="shrink-0 rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                Stage {ctx.disclosure_level}
              </span>
            </div>
            {ctx.listing_title && (
              <p className="mt-0.5 truncate text-xs text-slate-600">
                {ctx.listing_title}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chat */}
      <ChatWindow
        applicationId={applicationId}
        currentUserId={ctx.current_user_id}
        otherPartyName={displayName}
        applicationStatus={ctx.status}
        disclosureLevel={ctx.disclosure_level}
        isEmployer={true}
      />
    </div>
  );
}
