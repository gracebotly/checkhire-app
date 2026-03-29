"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, Circle, RotateCcw, Check, Loader2, AlertCircle } from "lucide-react";

interface VideoRecorderProps {
  prompt: string;
  timeLimitSeconds: number;
  maxRetakes: number;
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
}

export function VideoRecorder({
  prompt,
  timeLimitSeconds,
  maxRetakes,
  onRecorded,
  disabled = false,
}: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [state, setState] = useState<"idle" | "preview" | "countdown" | "recording" | "review">("idle");
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [retakeCount, setRetakeCount] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedUrlRef = useRef<string | null>(null);

  // Keep ref in sync with state so cleanup always has the latest URL
  useEffect(() => {
    recordedUrlRef.current = recordedUrl;
  }, [recordedUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
    };
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      setState("preview");
    } catch {
      setError("Camera access denied. Please allow camera and microphone access to record your video.");
    }
  }, []);

  const startCountdown = useCallback(() => {
    setState("countdown");
    setCountdown(3);
    let count = 3;
    countdownRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        startRecording();
      } else {
        setCountdown(count);
      }
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    setElapsed(0);
    setState("recording");

    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
      setState("review");

      // Stop camera preview
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000); // collect data every second

    // Auto-stop timer
    let seconds = 0;
    timerRef.current = setInterval(() => {
      seconds += 1;
      setElapsed(seconds);
      if (seconds >= timeLimitSeconds) {
        if (timerRef.current) clearInterval(timerRef.current);
        recorder.stop();
      }
    }, 1000);
  }, [timeLimitSeconds]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleRetake = useCallback(async () => {
    setRetakeCount((c) => c + 1);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    await startCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordedUrl]);

  const handleConfirm = useCallback(() => {
    if (recordedBlob) {
      onRecorded(recordedBlob);
    }
  }, [recordedBlob, onRecorded]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-slate-900">{prompt}</p>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="relative overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "16/9" }}>
        {state === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Camera className="mb-2 h-8 w-8 text-slate-600" />
            <button
              type="button"
              onClick={startCamera}
              disabled={disabled}
              className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start Camera
            </button>
          </div>
        )}

        {(state === "preview" || state === "countdown" || state === "recording") && (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
          />
        )}

        {state === "review" && recordedUrl && (
          <video
            src={recordedUrl}
            className="h-full w-full object-cover"
            controls
            playsInline
            controlsList="nodownload"
          />
        )}

        {/* Countdown overlay */}
        {state === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <motion.span
              key={countdown}
              initial={{ opacity: 0, scale: 1.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="font-display text-6xl font-bold text-white"
            >
              {countdown}
            </motion.span>
          </div>
        )}

        {/* Recording indicator */}
        {state === "recording" && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5">
            <Circle className="h-3 w-3 fill-red-500 text-red-500 animate-pulse" />
            <span className="text-xs font-semibold tabular-nums text-white">
              {formatTime(elapsed)} / {formatTime(timeLimitSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-600">
          {state === "idle" && `${timeLimitSeconds}s max · ${maxRetakes} retake${maxRetakes !== 1 ? "s" : ""} allowed`}
          {state === "preview" && "Camera ready. Click Record to begin."}
          {state === "countdown" && "Get ready..."}
          {state === "recording" && "Recording... Click Stop when done."}
          {state === "review" && `Review your answer. ${maxRetakes - retakeCount > 0 ? `${maxRetakes - retakeCount} retake${maxRetakes - retakeCount !== 1 ? "s" : ""} remaining.` : "No retakes remaining."}`}
        </div>

        <div className="flex items-center gap-2">
          {state === "preview" && (
            <button
              type="button"
              onClick={startCountdown}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-red-700"
            >
              <Circle className="h-3 w-3 fill-white" />
              Record
            </button>
          )}

          {state === "recording" && (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-red-700"
            >
              Stop
            </button>
          )}

          {state === "review" && (
            <>
              {retakeCount < maxRetakes && (
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retake
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover"
              >
                <Check className="h-3.5 w-3.5" />
                Confirm
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
