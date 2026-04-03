"use client";

import { useRef, useState } from "react";
import { CheckCircle, FileText, Loader2, Paperclip, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConversationThread } from "@/components/gig/ConversationThread";
import type { DealInterest } from "@/types/database";

type ScreeningQuestion = {
  id: string;
  type: "yes_no" | "short_text" | "multiple_choice";
  text: string;
  options?: string[];
  dealbreaker_answer?: string;
};

type UploadedApplicationFile = {
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  signed_url?: string;
};

type Props = {
  dealId: string;
  existingInterest: DealInterest | null;
  onSubmitted: () => void;
  currentUserId: string;
  screeningQuestions?: ScreeningQuestion[];
};

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "danger" }
> = {
  pending: { label: "Pending Review", variant: "warning" },
  in_conversation: { label: "In Conversation", variant: "default" },
  accepted: { label: "Accepted", variant: "success" },
  rejected: { label: "Not Selected", variant: "default" },
  withdrawn: { label: "Withdrawn", variant: "default" },
};

export function InterestForm({
  dealId,
  existingInterest,
  onSubmitted,
  currentUserId,
  screeningQuestions = [],
}: Props) {
  const [pitch, setPitch] = useState("");
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([""]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedApplicationFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (existingInterest) {
    const statusInfo = statusLabels[existingInterest.status] || statusLabels.pending;
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Your Application</h3>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{existingInterest.pitch_text}</p>

        {existingInterest.portfolio_urls && existingInterest.portfolio_urls.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-slate-600">Portfolio</p>
            <div className="space-y-1">
              {existingInterest.portfolio_urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block cursor-pointer truncate text-sm text-brand transition-colors duration-200 hover:text-brand-hover"
                >
                  {url}
                </a>
              ))}
            </div>
          </div>
        )}

        {existingInterest.application_files && existingInterest.application_files.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-slate-600">Files</p>
            <div className="space-y-1.5">
              {existingInterest.application_files.map((file) => (
                <a
                  key={file.id}
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-brand transition-colors duration-200 hover:bg-gray-50"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {file.file_name}
                </a>
              ))}
            </div>
          </div>
        )}

        {(existingInterest.status === "pending" ||
          existingInterest.status === "in_conversation" ||
          existingInterest.status === "accepted") &&
          currentUserId && (
            <div className="mt-4">
              <ConversationThread
                dealId={dealId}
                interestId={existingInterest.id}
                currentUserId={currentUserId}
                threadClosed={false}
              />
            </div>
          )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
        <CheckCircle className="mx-auto h-8 w-8 text-brand" />
        <p className="mt-2 text-sm font-semibold text-slate-900">Application submitted!</p>
        <p className="mt-1 text-xs text-slate-600">
          The client will review your application and may start a conversation before selecting.
        </p>
      </div>
    );
  }

  const updatePortfolioUrl = (index: number, value: string) => {
    setPortfolioUrls((prev) => prev.map((url, i) => (i === index ? value : url)));
  };

  const addPortfolioUrl = () => {
    if (portfolioUrls.length >= 3) return;
    setPortfolioUrls((prev) => [...prev, ""]);
  };

  const removePortfolioUrl = (index: number) => {
    setPortfolioUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadedFiles.length >= 3) {
      setError("Maximum 3 files");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File too large. Maximum 20MB.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/deals/${dealId}/interest/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setUploadedFiles((prev) => [...prev, data.file]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (pitch.trim().length < 20) {
      setError("Cover message must be at least 20 characters");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/deals/${dealId}/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitch_text: pitch.trim(),
          portfolio_urls: portfolioUrls.filter((u) => u.trim()),
          screening_answers: screeningQuestions.map((q) => ({
            question_id: q.id,
            answer: screeningAnswers[q.id] || "",
          })),
          file_urls: uploadedFiles.map((file) => ({
            file_url: file.file_url,
            file_name: file.file_name,
            file_size_bytes: file.file_size_bytes,
          })),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setSubmitted(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">Apply for this gig</h3>
      <p className="mt-1 text-xs text-slate-600">
        Stand out by sharing your work, experience, and relevant details. Clients review applications and may start a conversation before selecting.
      </p>

      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}

      {screeningQuestions.length > 0 && (
        <div className="mt-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-900">
            Screening Questions
          </p>
          {screeningQuestions.map((q) => (
            <div key={q.id}>
              <label className="mb-1.5 block text-sm font-medium text-slate-900">
                {q.text}
              </label>
              {q.type === "yes_no" && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={screeningAnswers[q.id] === "yes" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setScreeningAnswers((prev) => ({ ...prev, [q.id]: "yes" }))
                    }
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={screeningAnswers[q.id] === "no" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setScreeningAnswers((prev) => ({ ...prev, [q.id]: "no" }))
                    }
                  >
                    No
                  </Button>
                </div>
              )}
              {q.type === "short_text" && (
                <Input
                  value={screeningAnswers[q.id] || ""}
                  onChange={(e) =>
                    setScreeningAnswers((prev) => ({
                      ...prev,
                      [q.id]: e.target.value,
                    }))
                  }
                  placeholder="Your answer..."
                  maxLength={200}
                />
              )}
              {q.type === "multiple_choice" && q.options && (
                <Select
                  value={screeningAnswers[q.id] || ""}
                  onValueChange={(v) =>
                    setScreeningAnswers((prev) => ({ ...prev, [q.id]: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {q.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-900">Cover message</label>
        <textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          placeholder="Introduce yourself — why are you a great fit for this gig?"
          maxLength={1000}
          rows={5}
          className="flex w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-slate-600">{pitch.length}/1000</span>
          <span className="text-xs text-slate-600">Min 20 characters</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-900">Portfolio links <span className="font-normal text-slate-600">(optional)</span></label>
          {portfolioUrls.length < 3 && (
            <Button type="button" variant="outline" size="sm" onClick={addPortfolioUrl}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add link
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {portfolioUrls.map((url, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={url}
                onChange={(e) => updatePortfolioUrl(index, e.target.value)}
                placeholder="https://example.com/your-work"
                maxLength={500}
              />
              {portfolioUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePortfolioUrl(index)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 cursor-pointer transition-colors duration-200 hover:bg-gray-100 hover:text-slate-900"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-900">
          Resume or work samples <span className="font-normal text-slate-600">(optional)</span>
        </label>
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || uploadedFiles.length >= 3}
            >
              {uploading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="mr-1 h-4 w-4" />
              )}
              {uploading ? "Uploading..." : "Upload file"}
            </Button>
            <span className="text-xs text-slate-600">Up to 3 files, 20MB each</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            onChange={handleFileUpload}
            accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.txt,.zip"
            className="hidden"
          />

          {uploadedFiles.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {uploadedFiles.map((file, index) => (
                <div
                  key={`${file.file_url}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2.5 py-1.5"
                >
                  <span className="truncate text-sm text-slate-900">{file.file_name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="ml-2 flex h-6 w-6 items-center justify-center rounded text-slate-600 cursor-pointer transition-colors duration-200 hover:bg-gray-100 hover:text-slate-900"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Button
          onClick={handleSubmit}
          disabled={submitting || uploading || pitch.trim().length < 20}
        >
          {submitting ? "Submitting..." : "Submit Application"}
        </Button>
      </div>
    </div>
  );
}
