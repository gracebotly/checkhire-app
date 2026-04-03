"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Paperclip, Send, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ActivityLogEntryWithUser } from "@/types/database";

type Props = {
  dealId: string;
  interestId: string;
  currentUserId: string;
  threadClosed?: boolean;
  otherPartyName?: string;
  otherPartyAvatar?: string | null;
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isImageFile(name: string | null): boolean {
  if (!name) return false;
  return /\.(png|jpg|jpeg|gif|webp)$/i.test(name);
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ConversationThread({
  dealId,
  interestId,
  currentUserId,
  threadClosed = false,
  otherPartyName,
  otherPartyAvatar,
}: Props) {
  const [messages, setMessages] = useState<ActivityLogEntryWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/interest/${interestId}/messages`);
      const data = await res.json();
      if (data.ok) {
        const newMsgs: ActivityLogEntryWithUser[] = data.messages;
        // Detect new messages from the other party (not our own)
        if (!loading && newMsgs.length > messages.length) {
          const latest = newMsgs[newMsgs.length - 1];
          if (latest && latest.user_id !== currentUserId) {
            // Check if the user is scrolled away from bottom
            const container = messagesContainerRef.current;
            if (container) {
              const isNearBottom =
                container.scrollHeight - container.scrollTop - container.clientHeight < 80;
              if (!isNearBottom) {
                setHasNewMessages(true);
              }
            }
          }
        }
        setMessages(newMsgs);
      }
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 15000);
    return () => clearInterval(interval);
  }, [dealId, interestId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || posting) return;

    setPosting(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/interest/${interestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setContent("");
      // Reset textarea height after send
      const textarea = document.querySelector<HTMLTextAreaElement>(
        'textarea[placeholder="Type a message..."]'
      );
      if (textarea) textarea.style.height = "36px";
      await fetchMessages();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to send", "error");
    } finally {
      setPosting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast("File too large. Maximum 20MB.", "error");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/deals/${dealId}/interest/${interestId}/messages/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      await fetchMessages();
      toast("File sent", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
          <div className="h-20 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {otherPartyName && (
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-3">
          {otherPartyAvatar ? (
            <img
              src={otherPartyAvatar}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-muted text-[10px] font-semibold text-brand">
              {getInitials(otherPartyName)}
            </div>
          )}
          <span className="text-sm font-medium text-slate-900">{otherPartyName}</span>
        </div>
      )}
      <div
        ref={messagesContainerRef}
        className="relative max-h-96 space-y-3 overflow-y-auto p-4"
        onScroll={() => {
          const container = messagesContainerRef.current;
          if (container) {
            const isNearBottom =
              container.scrollHeight - container.scrollTop - container.clientHeight < 80;
            if (isNearBottom) setHasNewMessages(false);
          }
        }}
      >
        {messages.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-600">
            No messages yet. Start the conversation.
          </p>
        )}

        {messages.map((message, i) => {
          const isOwn = message.user_id === currentUserId;

          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                ease: "easeOut",
                delay: i < 20 ? i * 0.02 : 0,
              }}
              className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-muted text-[10px] font-semibold text-brand">
                {getInitials(message.user?.display_name || null)}
              </div>

              <div
                className={`max-w-[75%] rounded-xl px-3 py-2 ${
                  isOwn ? "bg-brand-muted text-slate-900" : "bg-gray-50 text-slate-900"
                }`}
              >
                <p className="mb-0.5 text-xs font-medium text-slate-600">
                  {message.user?.display_name || "Unknown"}
                </p>

                {message.entry_type === "message" && message.content && (
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                )}

                {message.entry_type === "file" && message.file_url && (
                  <div className="mt-1">
                    {isImageFile(message.file_name) ? (
                      <a
                        href={message.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block cursor-pointer transition-colors duration-200"
                      >
                        <img
                          src={message.file_url}
                          alt={message.file_name || "Image"}
                          className="max-h-48 max-w-full rounded-lg"
                        />
                      </a>
                    ) : (
                      <a
                        href={message.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-brand transition-colors duration-200 hover:bg-gray-50"
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate">{message.file_name || "File"}</span>
                        {message.file_size_bytes && (
                          <span className="shrink-0 text-xs text-slate-600">
                            {formatFileSize(message.file_size_bytes)}
                          </span>
                        )}
                      </a>
                    )}
                  </div>
                )}

                <p className="mt-1 text-[10px] text-slate-600">{formatTime(message.created_at)}</p>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
        {hasNewMessages && (
          <button
            type="button"
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              setHasNewMessages(false);
            }}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 cursor-pointer rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white shadow-md transition-colors duration-200 hover:bg-brand-hover"
          >
            New messages ↓
          </button>
        )}
      </div>

      {!threadClosed ? (
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                // Auto-grow
                const el = e.target;
                el.style.height = "36px";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              maxLength={2000}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
              style={{ minHeight: "36px", maxHeight: "120px" }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleSend}
              disabled={!content.trim() || posting}
            >
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.txt,.zip"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border-t border-gray-100 p-3 text-center">
          <p className="text-xs text-slate-600">This conversation is closed.</p>
        </div>
      )}
    </div>
  );
}
