"use client";

import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface ChatInputProps {
  onSend: (text: string) => Promise<{ ok: boolean; pii_warning?: string | null }>;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [piiWarning, setPiiWarning] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;

    setSending(true);
    setPiiWarning(null);

    const result = await onSend(trimmed);
    if (result.ok) {
      setText("");
      if (result.pii_warning) {
        setPiiWarning(result.pii_warning);
        setTimeout(() => setPiiWarning(null), 8000);
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
    setSending(false);
    textareaRef.current?.focus();
  }, [text, sending, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping?.();
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div className="border-t border-gray-200 bg-white p-3">
      {piiWarning && (
        <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-slate-900">
          {piiWarning}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "This conversation is closed." : placeholder}
          disabled={disabled || sending}
          rows={1}
          maxLength={5000}
          className={cn(
            "flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-slate-900",
            "font-sans placeholder:text-slate-600 transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-brand",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
            "thin-scrollbar"
          )}
        />
        <button
          onClick={() => void handleSend()}
          disabled={!text.trim() || sending || disabled}
          className={cn(
            "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
            text.trim() && !disabled ? "bg-brand text-white hover:bg-brand-hover" : "bg-gray-100 text-slate-600"
          )}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
