"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

type UseTypingIndicatorOptions = {
  applicationId: string;
  currentUserId: string;
};

type UseTypingIndicatorReturn = {
  isOtherTyping: boolean;
  notifyTyping: () => void;
};

export function useTypingIndicator({
  applicationId,
  currentUserId,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const lastBroadcastRef = useRef(0);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`typing:application:${applicationId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        const senderId = payload.payload?.user_id;
        if (senderId && senderId !== currentUserId) {
          setIsOtherTyping(true);

          if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);

          expiryTimerRef.current = setTimeout(() => {
            setIsOtherTyping(false);
          }, 5000);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [applicationId, currentUserId]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastBroadcastRef.current < 2000) return;
    lastBroadcastRef.current = now;

    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUserId },
    });
  }, [currentUserId]);

  return { isOtherTyping, notifyTyping };
}
