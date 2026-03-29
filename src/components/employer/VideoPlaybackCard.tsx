"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, ChevronDown, ChevronUp, Loader2, AlertCircle } from "lucide-react";

interface VideoEntry {
  question_index: number;
  prompt: string;
  playback_url: string | null;
  recorded_at: string;
}

interface VideoPlaybackCardProps {
  applicationId: string;
}

export function VideoPlaybackCard({ applicationId }: VideoPlaybackCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    if (expanded && !loaded) {
      setLoading(true);
      setError(null);
      fetch(`/api/employer/applications/${applicationId}/video`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setVideos(data.videos || []);
          } else {
            setError(data.message || "Failed to load videos.");
          }
          setLoaded(true);
        })
        .catch(() => setError("Network error."))
        .finally(() => setLoading(false));
    }
  }, [expanded, loaded, applicationId]);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    // Apply to all video elements
    document.querySelectorAll<HTMLVideoElement>(`[data-app-video="${applicationId}"]`).forEach((v) => {
      v.playbackRate = speed;
    });
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-3 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
      >
        <Video className="h-3 w-3" />
        <ChevronDown className="h-3 w-3" />
        Watch video responses
      </button>
    );
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
        >
          <Video className="h-3 w-3" />
          <ChevronUp className="h-3 w-3" />
          Hide videos
        </button>

        {videos.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-600">Speed:</span>
            {[1, 1.5, 2].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => handleSpeedChange(speed)}
                className={`cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium transition-colors duration-200 ${
                  playbackSpeed === speed
                    ? "bg-brand text-white"
                    : "bg-gray-50 text-slate-600 hover:bg-gray-100"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
          </div>
        )}

        {error && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && videos.length === 0 && loaded && (
          <p className="mt-2 text-xs text-slate-600">No video responses.</p>
        )}

        {!loading && videos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-3 space-y-3"
          >
            {videos.map((v) => (
              <div key={v.question_index} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-medium text-slate-900">
                  Q{v.question_index + 1}: {v.prompt}
                </p>
                {v.playback_url ? (
                  <div className="overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "16/9" }}>
                    <video
                      src={v.playback_url}
                      controls
                      playsInline
                      controlsList="nodownload nofullscreen"
                      disablePictureInPicture
                      data-app-video={applicationId}
                      className="h-full w-full object-cover"
                      onLoadedMetadata={(e) => {
                        (e.target as HTMLVideoElement).playbackRate = playbackSpeed;
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-lg bg-gray-200 py-8">
                    <p className="text-xs text-slate-600">Video unavailable</p>
                  </div>
                )}
                <p className="mt-1 text-xs text-slate-600">
                  Recorded {new Date(v.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
