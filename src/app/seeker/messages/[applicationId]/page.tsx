"use client";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { ArrowLeft, Building, Loader2 } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { ApplicationStatus } from "@/types/database";

type ChatContext = {
  company_name: string;
  listing_title: string;
  status: ApplicationStatus;
  current_user_id: string;
};

export default function SeekerChatPage({
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
        const threadsRes = await fetch("/api/messages/threads");
        const threadsData = await threadsRes.json();

        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setError("Not authenticated.");
          return;
        }

        const thread = (threadsData.threads || []).find(
          (t: { application_id: string }) => t.application_id === applicationId
        );

        setCtx({
          company_name: thread?.company_name || "Employer",
          listing_title: thread?.listing_title || "",
          status: thread?.status || "applied",
          current_user_id: user.id,
        });
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
      <div className="min-h-screen p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
          {error || "Conversation not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/seeker/messages"
            className="cursor-pointer text-slate-600 transition-colors duration-200 hover:text-slate-900"
            aria-label="Back to messages"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-slate-600" />
              <h1 className="truncate text-sm font-semibold text-slate-900">
                {ctx.company_name}
              </h1>
            </div>
            {ctx.listing_title && (
              <p className="mt-0.5 truncate text-xs text-slate-600">
                {ctx.listing_title}
              </p>
            )}
          </div>
        </div>
      </div>

      <ChatWindow
        applicationId={applicationId}
        currentUserId={ctx.current_user_id}
        otherPartyName={ctx.company_name}
        applicationStatus={ctx.status}
        isEmployer={false}
      />
    </div>
  );
}
