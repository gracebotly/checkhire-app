"use client";

import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/database";
import { useCallback, useEffect, useRef, useState } from "react";

type UseRealtimeChatOptions = {
  applicationId: string;
  currentUserId: string;
};

type UseRealtimeChatReturn = {
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<{ ok: boolean; pii_warning?: string | null }>;
  loadMore: () => Promise<void>;
  markAllRead: () => Promise<void>;
};

/**
 * React hook for real-time chat on a specific application.
 */
export function useRealtimeChat({
  applicationId,
  currentUserId,
}: UseRealtimeChatOptions): UseRealtimeChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const cursorRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMessages() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/messages?application_id=${applicationId}&limit=50`);
        const data = await res.json();
        if (cancelled) return;

        if (data.ok) {
          setMessages(data.messages || []);
          setHasMore(data.has_more || false);
          cursorRef.current = data.cursor || null;
        } else {
          setError(data.message || "Failed to load messages.");
        }
      } catch {
        if (!cancelled) setError("Network error loading messages.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchMessages();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`chat:application:${applicationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `application_id=eq.${applicationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [applicationId]);

  useEffect(() => {
    fetch("/api/messages/read-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: applicationId }),
    }).catch(() => {});
  }, [applicationId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: Message = {
        id: optimisticId,
        application_id: applicationId,
        sender_id: currentUserId,
        sender_type: "candidate",
        message_text: text,
        message_type: "text",
        metadata: null,
        read_at: null,
        edited_at: null,
        deleted_at: null,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            application_id: applicationId,
            message_text: text,
          }),
        });
        const data = await res.json();

        if (data.ok && data.message) {
          setMessages((prev) => prev.map((m) => (m.id === optimisticId ? data.message : m)));
          return { ok: true, pii_warning: data.pii_warning || null };
        }

        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        return { ok: false };
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        return { ok: false };
      }
    },
    [applicationId, currentUserId]
  );

  const loadMore = useCallback(async () => {
    if (!cursorRef.current || !hasMore) return;

    try {
      const res = await fetch(
        `/api/messages?application_id=${applicationId}&limit=50&cursor=${cursorRef.current}`
      );
      const data = await res.json();

      if (data.ok) {
        setMessages((prev) => [...(data.messages || []), ...prev]);
        setHasMore(data.has_more || false);
        cursorRef.current = data.cursor || null;
      }
    } catch {
      // no-op
    }
  }, [applicationId, hasMore]);

  const markAllRead = useCallback(async () => {
    try {
      await fetch("/api/messages/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId }),
      });
    } catch {
      // no-op
    }
  }, [applicationId]);

  return { messages, isLoading, hasMore, error, sendMessage, loadMore, markAllRead };
}
