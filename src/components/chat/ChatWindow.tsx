"use client";

import type { ApplicationStatus } from "@/types/database";
import { Loader2, MessageSquare } from "lucide-react";
import { useEffect, useRef } from "react";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { SystemMessageCard } from "./SystemMessageCard";
import { TypingIndicator } from "./TypingIndicator";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface ChatWindowProps {
  applicationId: string;
  currentUserId: string;
  otherPartyName: string;
  applicationStatus: ApplicationStatus;
}

export function ChatWindow({
  applicationId,
  currentUserId,
  otherPartyName,
  applicationStatus,
}: ChatWindowProps) {
  const { messages, isLoading, hasMore, error, sendMessage, loadMore } = useRealtimeChat({
    applicationId,
    currentUserId,
  });

  const { isOtherTyping, notifyTyping } = useTypingIndicator({
    applicationId,
    currentUserId,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (el && el.scrollTop === 0 && hasMore) {
      void loadMore();
    }
  };

  const isClosed = ["rejected", "hired"].includes(applicationStatus);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-center text-sm text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto thin-scrollbar">
        {hasMore && (
          <div className="py-3 text-center">
            <button
              onClick={() => void loadMore()}
              className="cursor-pointer text-xs font-medium text-brand transition-colors duration-200 hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              Load older messages
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-20">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-muted">
              <MessageSquare className="h-5 w-5 text-brand" />
            </div>
            <p className="text-sm text-slate-600">Start the conversation with {otherPartyName}</p>
          </div>
        ) : (
          <div className="py-3">
            {messages.map((msg) => {
              if (msg.sender_type === "system" || msg.message_type !== "text") {
                return <SystemMessageCard key={msg.id} message={msg} />;
              }

              return (
                <ChatBubble key={msg.id} message={msg} isOwn={msg.sender_id === currentUserId} />
              );
            })}
          </div>
        )}

        {isOtherTyping && <TypingIndicator name={otherPartyName} />}

        <div ref={bottomRef} />
      </div>

      <ChatInput
        onSend={sendMessage}
        onTyping={notifyTyping}
        disabled={isClosed}
        placeholder={isClosed ? "This conversation is closed." : `Message ${otherPartyName}...`}
      />
    </div>
  );
}
