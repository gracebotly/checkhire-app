"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProposalSlider } from "@/components/gig/ProposalSlider";
import { useToast } from "@/components/ui/toast";

type Props = {
  dealId: string;
  totalAmountCents: number;
  guestToken: string | null;
  onSubmitted: () => void;
  children: React.ReactNode;
};

const CATEGORIES = [
  { value: "not_delivered", label: "Not delivered", desc: "Work was never delivered" },
  { value: "wrong_deliverables", label: "Wrong deliverables", desc: "Received something different than agreed" },
  { value: "incomplete_work", label: "Incomplete work", desc: "Only partially completed" },
  { value: "quality_mismatch", label: "Quality mismatch", desc: "Quality significantly below expectations" },
  { value: "communication_issues", label: "Communication issues", desc: "Freelancer became unresponsive" },
  { value: "other", label: "Other", desc: "Something else" },
];

export function DisputeSubmissionFlow({
  dealId,
  totalAmountCents,
  guestToken,
  onSubmitted,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const { toast } = useToast();

  // Step 1: Category
  const [category, setCategory] = useState("");

  // Step 2: Evidence
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 3: Proposal
  const [percentage, setPercentage] = useState(50);
  const [reason, setReason] = useState("");
  const [justification, setJustification] = useState("");

  // Step 4: Submit
  const [submitting, setSubmitting] = useState(false);

  const goForward = () => {
    setDirection(1);
    setCurrentStep((s) => Math.min(s + 1, 3));
  };
  const goBack = () => {
    setDirection(-1);
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).filter(
      (f) => f.size <= 10 * 1024 * 1024
    );
    setEvidenceFiles((prev) => [...prev, ...newFiles]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Upload evidence files first
      for (const file of evidenceFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("is_submission_evidence", "true");
        if (guestToken) formData.append("guest_token", guestToken);

        const uploadUrl = guestToken
          ? `/api/deals/${dealId}/guest-activity/upload`
          : `/api/deals/${dealId}/activity/upload`;
        await fetch(uploadUrl, { method: "POST", body: formData });
      }

      // Submit dispute
      const body: Record<string, unknown> = {
        category,
        reason,
        proposed_percentage: percentage,
        justification,
      };
      if (guestToken) body.guest_token = guestToken;

      const res = await fetch(`/api/deals/${dealId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);

      toast("Dispute opened — funds are frozen", "success");
      setOpen(false);
      onSubmitted();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to submit dispute", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const canAdvance = [
    !!category,
    evidenceFiles.length > 0,
    reason.length >= 50 && justification.length >= 50,
    true,
  ];

  const resetForm = () => {
    setCurrentStep(0);
    setCategory("");
    setEvidenceFiles([]);
    setPercentage(50);
    setReason("");
    setJustification("");
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetForm();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[0, 1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full transition-colors duration-200 ${
                s === currentStep
                  ? "bg-brand"
                  : s < currentStep
                    ? "bg-brand/40"
                    : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          {currentStep === 0 && (
            <motion.div
              key="step0"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-3"
            >
              <h3 className="text-lg font-semibold text-slate-900">
                What went wrong?
              </h3>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`w-full text-left rounded-xl border p-4 cursor-pointer transition-colors duration-200 ${
                      category === cat.value
                        ? "border-brand bg-brand-muted"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {cat.label}
                    </p>
                    <p className="text-xs text-slate-600">{cat.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-3"
            >
              <h3 className="text-lg font-semibold text-slate-900">
                Upload evidence
              </h3>
              <p className="text-sm text-slate-600">
                Screenshots, files, or messages that support your claim. At
                least 1 required.
              </p>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-dashed border-2 border-gray-300 rounded-xl p-4 text-center cursor-pointer transition-colors duration-200 hover:border-gray-400"
              >
                <Upload className="h-6 w-6 text-slate-600 mx-auto mb-1" />
                <p className="text-sm text-slate-600">Click to add files</p>
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.txt,.zip"
                onChange={handleFileAdd}
                className="hidden"
              />

              {evidenceFiles.length > 0 && (
                <div className="space-y-1">
                  {evidenceFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <span className="text-sm text-slate-900 truncate">
                        {f.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEvidenceFiles((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        className="text-xs text-red-600 cursor-pointer transition-colors duration-200 hover:text-red-700 ml-2 shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-slate-900">
                Propose a fair split
              </h3>

              <ProposalSlider
                totalAmountCents={totalAmountCents}
                value={percentage}
                onChange={setPercentage}
              />

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  What went wrong?{" "}
                  <span className="text-slate-600 font-normal">
                    (min 50 chars)
                  </span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 2000))}
                  placeholder="Describe the problem..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                />
                <p className="text-xs text-slate-600 text-right mt-1">
                  {reason.length}/2000
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Why is this split fair?{" "}
                  <span className="text-slate-600 font-normal">
                    (min 50 chars)
                  </span>
                </label>
                <textarea
                  value={justification}
                  onChange={(e) =>
                    setJustification(e.target.value.slice(0, 2000))
                  }
                  placeholder="Explain why this split is fair..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                />
                <p className="text-xs text-slate-600 text-right mt-1">
                  {justification.length}/2000
                </p>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-slate-900">
                Review & submit
              </h3>

              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600">
                    Category
                  </p>
                  <p className="text-sm text-slate-900">
                    {CATEGORIES.find((c) => c.value === category)?.label}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600">
                    Evidence
                  </p>
                  <p className="text-sm text-slate-900">
                    {evidenceFiles.length} file
                    {evidenceFiles.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600">
                    Proposed split
                  </p>
                  <p className="text-sm text-slate-900 font-mono tabular-nums">
                    {percentage}% to freelancer ($
                    {((totalAmountCents * percentage) / 100 / 100).toFixed(2)})
                    — {100 - percentage}% to client ($
                    {(
                      (totalAmountCents * (100 - percentage)) /
                      100 /
                      100
                    ).toFixed(2)}
                    )
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-800">
                  Opening a dispute will freeze all funds until a resolution is
                  reached.
                </p>
              </div>

              <Button
                variant="danger"
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Dispute"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          {currentStep < 3 && (
            <Button
              size="sm"
              onClick={goForward}
              disabled={!canAdvance[currentStep]}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
