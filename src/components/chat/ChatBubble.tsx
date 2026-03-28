"use client";

import { cn } from "@/lib/utils";
import type { Message } from "@/types/database";
import { motion } from "framer-motion";
import { Check, CheckCheck } from "lucide-react";

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  showTimestamp?: boolean;
}

export function ChatBubble({ message, isOwn, showTimestamp = true }: ChatBubbleProps) {
  const isSystem = message.sender_type === "system";

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex justify-center px-4 py-1.5"
      >
        <div className="max-w-md rounded-lg bg-gray-50 px-3 py-1.5 text-center text-xs text-slate-600">
          {message.message_text}
          {showTimestamp && (
            <span className="ml-2 font-mono text-[10px] text-slate-600">{formatTime(message.created_at)}</span>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex px-4 py-0.5", isOwn ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2",
          isOwn
            ? "rounded-br-md bg-brand text-white"
            : "rounded-bl-md border border-gray-200 bg-white text-slate-900"
        )}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.message_text}</p>
        <div className={cn("mt-1 flex items-center gap-1", isOwn ? "justify-end" : "justify-start")}>
          {showTimestamp && (
            <span className={cn("font-mono text-[10px]", isOwn ? "text-white/70" : "text-slate-600")}>
              {formatTime(message.created_at)}
            </span>
          )}
          {isOwn &&
            (message.read_at ? (
              <CheckCheck className="h-3 w-3 text-white/70" />
            ) : (
              <Check className="h-3 w-3 text-white/70" />
            ))}
        </div>
      </div>
    </motion.div>
  );
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
