"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, Shield, Video, X } from "lucide-react";
import { useState } from "react";
import { ScreeningQuiz } from "./ScreeningQuiz";
import { VideoApplicationFlow } from "@/components/seeker/VideoApplicationFlow";
import type { ScreeningQuestion, VideoQuestion } from "@/types/database";

interface ApplyModalProps {
  listingId: string;
  listingTitle: string;
  requiresScreeningQuiz: boolean;
  screeningQuestions: ScreeningQuestion[];
  requiresVideo?: boolean;
  videoQuestions?: VideoQuestion[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (pseudonym: string) => void;
}

export function ApplyModal({
  listingId,
  listingTitle,
  requiresScreeningQuiz,
  screeningQuestions,
  requiresVideo = false,
  videoQuestions = [],
  open,
  onOpenChange,
  onSuccess,
}: ApplyModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ pseudonym: string } | null>(null);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [videoBlobs, setVideoBlobs] = useState<{ questionIndex: number; blob: Blob }[]>([]);
  const [videosReady, setVideosReady] = useState(!requiresVideo || videoQuestions.length === 0);

  const handleVideoComplete = (blobs: { questionIndex: number; blob: Blob }[]) => {
    setVideoBlobs(blobs);
    setVideosReady(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // Step 1: Create application
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_listing_id: listingId,
          screening_responses: requiresScreeningQuiz ? responses : undefined,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.message || "Failed to submit application.");
        setSubmitting(false);
        return;
      }

      // Step 2: Upload video responses if any
      if (videoBlobs.length > 0 && data.application?.id) {
        const appId = data.application.id;
        const videoResponses: { question_index: number; video_url: string; recorded_at: string }[] = [];

        for (const vb of videoBlobs) {
          try {
            // Get signed upload URL
            const uploadRes = await fetch(`/api/applications/${appId}/video-upload`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question_index: vb.questionIndex }),
            });
            const uploadData = await uploadRes.json();

            if (uploadData.ok && uploadData.upload_url) {
              // Upload the blob
              await fetch(uploadData.upload_url, {
                method: "PUT",
                headers: { "Content-Type": "video/webm" },
                body: vb.blob,
              });

              videoResponses.push({
                question_index: vb.questionIndex,
                video_url: uploadData.storage_path,
                recorded_at: new Date().toISOString(),
              });
            }
          } catch (err) {
            console.error(`[apply] Video upload failed for Q${vb.questionIndex}:`, err);
          }
        }

        // Step 3: Update application with video_responses
        if (videoResponses.length > 0) {
          await fetch(`/api/applications/${appId}/video-upload`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ video_responses: videoResponses }),
          }).catch(() => {});
        }
      }

      setSuccess({ pseudonym: data.application.pseudonym });
      setTimeout(() => onSuccess(data.application.pseudonym), 2500);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={success ? undefined : onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl outline-none"
          onInteractOutside={success ? (e) => e.preventDefault() : undefined}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  {success ? "Application Submitted" : "Apply to this role"}
                </h2>
                {!success && <p className="mt-0.5 text-xs text-slate-600">{listingTitle}</p>}
              </div>
              {!success && (
                <DialogPrimitive.Close
                  className="cursor-pointer rounded-lg p-1.5 text-slate-600 transition-colors duration-200 hover:bg-gray-50"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
              )}
            </div>

            <div className="px-6 py-5">
              {success ? (
                <div className="flex flex-col items-center py-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">
                    You&apos;re in!
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Your pseudonym for this application is:
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-muted px-4 py-2">
                    <Shield className="h-4 w-4 text-brand" />
                    <span className="text-base font-bold text-brand">{success.pseudonym}</span>
                  </div>
                  <p className="mt-4 max-w-xs text-xs text-slate-600">
                    The employer will see you as &ldquo;{success.pseudonym}&rdquo; —
                    your real name is hidden until you advance in the hiring process.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-5 flex items-start gap-3 rounded-lg bg-brand-muted p-3">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <p className="text-xs text-slate-900">
                      You&apos;ll apply with a random pseudonym. The employer will see
                      your skills, experience, and screening answers — but not your
                      name, email, or resume file.
                    </p>
                  </div>

                  {requiresScreeningQuiz && screeningQuestions.length > 0 && (
                    <div className="mb-5">
                      <h3 className="mb-3 font-display text-sm font-semibold text-slate-900">
                        Screening Questions
                      </h3>
                      <ScreeningQuiz
                        questions={screeningQuestions}
                        responses={responses}
                        onChange={setResponses}
                      />
                    </div>
                  )}

                  {requiresVideo && videoQuestions.length > 0 && !videosReady && (
                    <div className="mb-5">
                      <VideoApplicationFlow
                        questions={videoQuestions}
                        onComplete={handleVideoComplete}
                        disabled={submitting}
                      />
                    </div>
                  )}

                  {requiresVideo && videosReady && videoBlobs.length > 0 && (
                    <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <Video className="h-4 w-4 text-emerald-600" />
                      <p className="text-xs text-emerald-700">
                        {videoBlobs.length} video response{videoBlobs.length !== 1 ? "s" : ""} recorded and ready to submit.
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                      {error}
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || (requiresVideo && !videosReady)}
                    className="w-full cursor-pointer bg-brand text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {submitting ? "Submitting..." : "Submit Application"}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
