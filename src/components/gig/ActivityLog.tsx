"use client";

import { motion } from "motion/react";
import { Bot, FileText, Image } from "lucide-react";
import type { ActivityLogEntryWithUser } from "@/types/database";

type Props = {
  entries: ActivityLogEntryWithUser[];
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isImageFile(name: string): boolean {
  return /\.(png|jpg|jpeg|gif|webp)$/i.test(name);
}

export function ActivityLog({ entries }: Props) {
  const filteredActivity = entries.filter((entry) => entry.entry_type !== "message");

  if (filteredActivity.length === 0) {
    return (
      <p className="text-sm text-slate-600">No activity yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {filteredActivity.map((entry, i) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.25,
            ease: "easeOut",
            delay: i * 0.04,
          }}
          className="flex gap-3"
        >
          {/* Avatar */}
          {entry.entry_type === "system" ? (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <Bot className="h-3.5 w-3.5 text-slate-600" />
            </div>
          ) : entry.user?.avatar_url ? (
            <img
              src={entry.user.avatar_url}
              alt=""
              className="h-6 w-6 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted text-[10px] font-semibold text-brand">
              {getInitials(entry.user?.display_name ?? null)}
            </div>
          )}

          {/* Content */}
          <div className="min-w-0 flex-1">
            {entry.entry_type === "system" ? (
              <p className="text-xs italic text-slate-600">
                {entry.content}
              </p>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {entry.user?.display_name || "Unknown"}
                  </span>
                  <span className="text-xs text-slate-600">
                    {formatRelativeTime(entry.created_at)}
                  </span>
                </div>
                {entry.entry_type === "file" && entry.file_url ? (
                  <a
                    href={entry.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex cursor-pointer items-center gap-1.5 text-sm text-brand transition-colors duration-200 hover:text-brand-hover"
                  >
                    {entry.file_name && isImageFile(entry.file_name) ? (
                      <Image className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    <span>{entry.file_name || "File"}</span>
                    {entry.file_size_bytes && (
                      <span className="text-xs text-slate-600">
                        {formatFileSize(entry.file_size_bytes)}
                      </span>
                    )}
                  </a>
                ) : (
                  <p className="mt-0.5 text-sm text-slate-900 whitespace-pre-wrap">
                    {entry.content}
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
