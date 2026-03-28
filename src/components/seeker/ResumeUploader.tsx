"use client";

import { FileText, Loader2, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface ResumeUploaderProps {
  userId: string;
  currentParseStatus: string;
  hasExistingResume: boolean;
  onParseComplete: (status: string, summary: string | null) => void;
}

export function ResumeUploader({
  userId,
  currentParseStatus,
  hasExistingResume,
  onParseComplete,
}: ResumeUploaderProps) {
  void userId;
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(currentParseStatus === "pending");
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 5 * 1024 * 1024;

  const pollParseStatus = useCallback(async () => {
    let attempts = 0;
    const maxAttempts = 30;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch("/api/seeker/resume/status");
        const data = await res.json();

        if (data.parse_status === "parsed") {
          clearInterval(interval);
          setParsing(false);
          onParseComplete("parsed", data.parsed_summary || null);
        } else if (data.parse_status === "failed" || attempts >= maxAttempts) {
          clearInterval(interval);
          setParsing(false);
          onParseComplete("failed", null);
        }
      } catch {
        clearInterval(interval);
        setParsing(false);
        onParseComplete("failed", null);
      }
    }, 1000);
  }, [onParseComplete]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (file.type !== "application/pdf") {
        setError("Only PDF files are accepted.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("File size must be under 5MB.");
        return;
      }

      setFileName(file.name);
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/seeker/resume", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!data.ok) {
          setError(data.message || "Upload failed.");
          setUploading(false);
          return;
        }

        setUploading(false);

        if (data.parse_status === "parsed") {
          onParseComplete("parsed", data.parsed_summary || null);
          return;
        }

        if (data.parse_status === "failed") {
          onParseComplete("failed", null);
          return;
        }

        setParsing(true);
        pollParseStatus();
      } catch {
        setError("Network error. Please try again.");
        setUploading(false);
      }
    },
    [MAX_SIZE, onParseComplete, pollParseStatus]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleClick = () => inputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const isProcessing = uploading || parsing;

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={isProcessing ? undefined : handleClick}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-200 ${
          isProcessing
            ? "cursor-wait border-gray-200 bg-gray-50"
            : dragActive
              ? "cursor-pointer border-brand bg-brand-muted"
              : "cursor-pointer border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <p className="mt-3 text-sm font-medium text-slate-900">
              {uploading ? "Uploading..." : "Parsing your resume..."}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {uploading
                ? "This won't take long."
                : "Extracting skills, experience, and education."}
            </p>
          </>
        ) : (
          <>
            {hasExistingResume || fileName ? (
              <FileText className="h-8 w-8 text-brand" />
            ) : (
              <Upload className="h-8 w-8 text-slate-600" />
            )}
            <p className="mt-3 text-sm font-medium text-slate-900">
              {hasExistingResume || fileName
                ? fileName || "Resume uploaded"
                : "Drop your resume here, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-slate-600">PDF only, 5MB max</p>
            {(hasExistingResume || fileName) && (
              <p className="mt-2 text-xs font-medium text-brand">
                Click to upload a new version
              </p>
            )}
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleInputChange}
        className="hidden"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
