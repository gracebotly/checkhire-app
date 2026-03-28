"use client";

import type { ChatThread } from "@/types/database";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { UnreadBadge } from "./UnreadBadge";

interface ChatThreadCardProps {
  thread: ChatThread;
  basePath: string;
  isEmployer: boolean;
  index?: number;
}

export function ChatThreadCard({
  thread,
  basePath,
  isEmployer,
  index = 0,
}: ChatThreadCardProps) {
  let displayName = thread.pseudonym;
  if (isEmployer) {
    if (thread.disclosure_level >= 3 && thread.full_name) {
      displayName = thread.full_name;
    } else if (thread.disclosure_level >= 2 && thread.first_name) {
      displayName = thread.first_name;
    }
  } else {
    displayName = thread.company_name;
  }

  const subtitle = thread.listing_title;
  const companyInitial = thread.company_name?.charAt(0)?.toUpperCase() || "C";
  const timeLabel = thread.last_message_at ? formatRelativeTime(thread.last_message_at) : "";

  const preview = thread.last_message_text
    ? thread.last_message_text.length > 60
      ? `${thread.last_message_text.substring(0, 60)}...`
      : thread.last_message_text
    : "No messages yet";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
    >
      <Link
        href={`${basePath}/${thread.application_id}`}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-4",
          "transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50/50",
          thread.unread_count > 0 && "border-brand/30 bg-brand-muted/30"
        )}
      >
        {isEmployer ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-muted">
            <Shield className="h-4 w-4 text-brand" />
          </div>
        ) : thread.logo_url ? (
          <Image
            src={thread.logo_url}
            alt={thread.company_name}
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
            {companyInitial}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">{displayName}</span>
            <span className="shrink-0 font-mono text-[10px] text-slate-600">{timeLabel}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-600">{subtitle}</p>
          <p
            className={cn(
              "mt-1 truncate text-xs",
              thread.unread_count > 0 ? "font-medium text-slate-900" : "text-slate-600"
            )}
          >
            {thread.last_message_sender_type === "system" ? "System: " : ""}
            {preview}
          </p>
        </div>

        <UnreadBadge count={thread.unread_count} />
      </Link>
    </motion.div>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
