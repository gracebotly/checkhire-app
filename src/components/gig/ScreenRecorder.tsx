"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Monitor, StopCircle, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Props = {
  disputeId: string;
  onUploadComplete: () => void;
};

export function ScreenRecorder({ disputeId, onUploadComplete }: Props) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setSupported(!!navigator.mediaDevices?.getDisplayMedia);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [previewUrl]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const recordedBlob = new Blob(chunksRef.current, {
          type: "video/webm",
        });
        setBlob(recordedBlob);
        setPreviewUrl(URL.createObjectURL(recordedBlob));
      };

      // Auto-stop when user stops sharing
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopRecording();
      });

      recorder.start(1000);
      setRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= 105) {
            toast("Recording will stop in 15 seconds", "info");
          }
          if (next >= 120) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch {
      toast("Screen recording was cancelled or denied", "error");
    }
  };

  const handleUpload = async () => {
    if (!blob) return;
    setUploading(true);
    try {
      const file = new File([blob], `screen-recording-${Date.now()}.webm`, {
        type: "video/webm",
      });
      const formData = new FormData();
      formData.append("evidence_type", "video");
      formData.append("file", file);
      formData.append("description", "Screen recording");

      const res = await fetch(`/api/disputes/${disputeId}/evidence`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message || "Upload failed", "error");
        return;
      }
      toast("Screen recording uploaded", "success");
      discard();
      onUploadComplete();
    } catch {
      toast("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const discard = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null);
    setPreviewUrl(null);
    setElapsed(0);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  if (!supported) {
    return (
      <p className="text-xs text-slate-600">
        Screen recording is not available on this device. Use file upload
        instead.
      </p>
    );
  }

  if (previewUrl && blob) {
    return (
      <div className="space-y-3">
        <video
          src={previewUrl}
          controls
          className="w-full rounded-lg border border-gray-200"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleUpload}
            disabled={uploading}
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            {uploading ? "Uploading..." : "Upload Recording"}
          </Button>
          <Button variant="ghost" size="sm" onClick={discard}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Discard
          </Button>
        </div>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 text-sm text-red-600 font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
          Recording... {formatTime(elapsed)}
        </span>
        <Button variant="danger" size="sm" onClick={stopRecording}>
          <StopCircle className="mr-1 h-3.5 w-3.5" />
          Stop Recording
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button variant="outline" size="sm" onClick={startRecording}>
        <Monitor className="mr-1 h-3.5 w-3.5" />
        Record Screen
      </Button>
      <p className="mt-1 text-xs text-slate-600">
        Recordings are limited to 2 minutes. Desktop only.
      </p>
    </div>
  );
}
