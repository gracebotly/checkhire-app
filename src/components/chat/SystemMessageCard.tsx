"use client";

import type { Message, MessageType } from "@/types/database";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  Info,
  UserCheck,
  XCircle,
} from "lucide-react";
import type { ComponentType } from "react";

const SYSTEM_ICONS: Partial<Record<MessageType, ComponentType<{ className?: string }>>> = {
  interview_request: Clock,
  interview_response: UserCheck,
  interview_scheduled: CalendarCheck,
  slot_selected: CalendarCheck,
  status_change: Info,
  system: Info,
};

interface SystemMessageCardProps {
  message: Message;
}

export function SystemMessageCard({ message }: SystemMessageCardProps) {
  const Icon = SYSTEM_ICONS[message.message_type] || Info;

  const action = message.metadata?.action;
  const toStatus = message.metadata?.to_status;
  const isAccepted = action === "accepted";
  const isDeclined = action === "declined";
  const isHired = toStatus === "hired";
  const isRejected = toStatus === "rejected";

  let bgClass = "bg-gray-50 border-gray-100";
  let textClass = "text-slate-600";
  let SelectedIcon = Icon;

  if (isAccepted || isHired) {
    bgClass = "bg-emerald-50 border-emerald-100";
    textClass = "text-emerald-700";
    SelectedIcon = CheckCircle;
  } else if (isDeclined || isRejected) {
    bgClass = "bg-red-50 border-red-100";
    textClass = "text-red-700";
    SelectedIcon = XCircle;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex justify-center px-4 py-2"
    >
      <div className={`flex max-w-md items-center gap-2 rounded-lg border px-3 py-2 ${bgClass}`}>
        <SelectedIcon className={`h-4 w-4 shrink-0 ${textClass}`} />
        <p className={`text-xs leading-relaxed ${textClass}`}>{message.message_text}</p>
        <span className="shrink-0 font-mono text-[10px] text-slate-600">
          {new Date(message.created_at).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
    </motion.div>
  );
}
