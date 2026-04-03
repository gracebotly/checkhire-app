"use client";

import { motion } from "motion/react";

type Props = { children: React.ReactNode; delayIndex?: number };

export function TimelineActionCard({ children, delayIndex = 0 }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut", delay: delayIndex * 0.04 }} className="flex gap-3 relative mt-4">
      <div className="z-10 shrink-0">
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border-2 border-brand bg-white">
          <div className="h-2.5 w-2.5 rounded-full bg-brand animate-pulse" />
        </div>
      </div>
      <div className="flex-1 min-w-0 pb-1">{children}</div>
    </motion.div>
  );
}
