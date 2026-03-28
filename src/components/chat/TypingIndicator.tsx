"use client";

interface TypingIndicatorProps {
  name: string;
}

export function TypingIndicator({ name }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3.5 py-2.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-600 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-600 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-600 [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-slate-600">{name} is typing</span>
    </div>
  );
}
