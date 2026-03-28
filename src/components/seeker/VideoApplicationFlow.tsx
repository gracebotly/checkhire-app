"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Video, Check, Loader2 } from "lucide-react";
import { VideoRecorder } from "./VideoRecorder";
import type { VideoQuestion } from "@/types/database";

interface VideoApplicationFlowProps {
  questions: VideoQuestion[];
  onComplete: (videoBlobs: { questionIndex: number; blob: Blob }[]) => void;
  disabled?: boolean;
}

export function VideoApplicationFlow({
  questions,
  onComplete,
  disabled = false,
}: VideoApplicationFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recordings, setRecordings] = useState<{ questionIndex: number; blob: Blob }[]>([]);
  const [reviewing, setReviewing] = useState(false);

  const handleRecorded = (blob: Blob) => {
    const updated = [...recordings, { questionIndex: currentIndex, blob }];
    setRecordings(updated);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setReviewing(true);
    }
  };

  const handleSubmit = () => {
    onComplete(recordings);
  };

  if (questions.length === 0) {
    return null;
  }

  if (reviewing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-brand" />
          <h3 className="text-sm font-semibold text-slate-900">
            Video Responses Ready
          </h3>
        </div>
        <div className="space-y-2">
          {questions.map((q, i) => {
            const recorded = recordings.find((r) => r.questionIndex === i);
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${recorded ? "bg-emerald-100" : "bg-gray-200"}`}>
                  {recorded ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <span className="text-xs font-medium text-slate-600">{i + 1}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-900">{q.prompt}</p>
                  <p className="text-xs text-slate-600">
                    {recorded
                      ? `Recorded · ${(recorded.blob.size / (1024 * 1024)).toFixed(1)} MB`
                      : "Skipped"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || recordings.length === 0}
          className="w-full cursor-pointer rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue with Application
        </button>
      </motion.div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-brand" />
          <h3 className="text-sm font-semibold text-slate-900">
            Video Question {currentIndex + 1} of {questions.length}
          </h3>
        </div>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full ${
                i < currentIndex
                  ? "bg-brand"
                  : i === currentIndex
                    ? "bg-brand/50"
                    : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      <VideoRecorder
        prompt={currentQuestion.prompt}
        timeLimitSeconds={currentQuestion.time_limit_seconds}
        maxRetakes={currentQuestion.max_retakes}
        onRecorded={handleRecorded}
        disabled={disabled}
      />
    </div>
  );
}
