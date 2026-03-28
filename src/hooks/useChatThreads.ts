"use client";

import type { ChatThread } from "@/types/database";
import { useCallback, useEffect, useState } from "react";

type UseChatThreadsReturn = {
  threads: ChatThread[];
  totalUnread: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useChatThreads(): UseChatThreadsReturn {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/messages/threads");
      const data = await res.json();
      if (data.ok) {
        setThreads(data.threads || []);
      } else {
        setError(data.message || "Failed to load conversations.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const totalUnread = threads.reduce((sum, t) => sum + t.unread_count, 0);

  return { threads, totalUnread, isLoading, error, refresh: fetchThreads };
}
