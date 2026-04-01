"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Clock } from "lucide-react";

type Props = {
  autoReleaseAt: string;
  role: "client" | "freelancer";
  onExpired: () => void;
};

function getRemaining(target: string): number {
  return Math.max(0, new Date(target).getTime() - Date.now());
}

function formatTime(ms: number): string {
  if (ms <= 0) return "Auto-releasing...";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

function getColor(ms: number): string {
  const hours = ms / (1000 * 60 * 60);
  if (hours < 6) return "text-red-600";
  if (hours < 24) return "text-amber-600";
  return "text-brand";
}

export function CountdownTimer({ autoReleaseAt, role, onExpired }: Props) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setRemaining(getRemaining(autoReleaseAt));

    const tick = () => {
      const r = getRemaining(autoReleaseAt);
      setRemaining(r);
      if (r <= 0) {
        onExpired();
      }
    };

    // Use 1s interval when < 1 hour, 60s otherwise
    const ms = getRemaining(autoReleaseAt);
    const interval = ms < 60 * 60 * 1000 ? 1000 : 60000;
    const id = setInterval(tick, interval);

    return () => clearInterval(id);
  }, [autoReleaseAt, onExpired]);

  if (remaining === null) {
    return <div className="h-20 animate-pulse rounded-xl border border-gray-200 bg-white" />;
  }

  const color = getColor(remaining);
  const label =
    role === "client"
      ? remaining > 60 * 60 * 1000
        ? `You have ${formatTime(remaining)} to review`
        : remaining <= 0
          ? "Review period expired"
          : "Review now — auto-release imminent"
      : remaining <= 0
        ? "Funds are being released"
        : `Client has ${formatTime(remaining)} to review`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <div className="flex items-center gap-3">
        <Clock className={`h-5 w-5 ${color}`} />
        <div>
          <p className={`text-2xl font-bold font-mono tabular-nums ${color}`}>
            {formatTime(remaining)}
          </p>
          <p className="text-sm text-slate-600">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}
