"use client";

import { useChatThreads } from "@/hooks/useChatThreads";
import { Loader2, MessageSquare } from "lucide-react";
import { ChatThreadCard } from "./ChatThreadCard";

interface ChatThreadListProps {
  basePath: string;
  isEmployer: boolean;
}

export function ChatThreadList({ basePath, isEmployer }: ChatThreadListProps) {
  const { threads, isLoading, error } = useChatThreads();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-muted">
          <MessageSquare className="h-5 w-5 text-brand" />
        </div>
        <h2 className="font-display text-lg font-semibold text-slate-900">No conversations yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          {isEmployer
            ? "When you or a candidate sends a message on an application, it will appear here."
            : "When an employer messages you about an application, it will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {threads.map((thread, index) => (
        <ChatThreadCard
          key={thread.application_id}
          thread={thread}
          basePath={basePath}
          isEmployer={isEmployer}
          index={index}
        />
      ))}
    </div>
  );
}
