"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Globe, Link2, Loader2, Mail, Paperclip, Pencil, Plus, Shield, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import {
  MilestoneBuilder,
  type MilestoneFormItem,
} from "@/components/gig/MilestoneBuilder";
import { useToast } from "@/components/ui/toast";
import { DEAL_CATEGORIES } from "@/lib/categories";
import { createClient } from "@/lib/supabase/client";
import type { DealTemplate, DealCategory } from "@/types/database";

type RepeatDealData = {
  title: string;
  description: string;
  deliverables: string | null;
  total_amount: number;
  category: string | null;
};

type InitialDraftData = {
  id: string;
  title: string;
  description: string;
  deliverables: string | null;
  total_amount: number;
  category: string | null;
  other_category_description: string | null;
  payment_frequency: string;
  deal_type?: "private" | "public" | null;
  deadline: string | null;
  has_milestones: boolean;
  description_brief_url: string | null;
  deliverables_brief_url: string | null;
  description_brief_name: string | null;
  deliverables_brief_name: string | null;
  screening_questions: unknown[];
  max_applicants?: number | null;
};

type Props = {
  initialTemplate?: DealTemplate | null;
  initialRepeatData?: RepeatDealData | null;
  initialDraft?: InitialDraftData | null;
  wizardData?: {
    category: string | null;
    title: string | null;
    amount: string | null;
    otherDescription: string | null;
    frequency: string | null;
  } | null;
};

const STEP_TITLES = [
  "Set the Terms",
  "Budget & Timing",
  "Review & Lock It In",
];
const TIMEFRAME_OPTIONS: { label: string; days: number | null }[] = [
  { label: "24 hours", days: 1 },
  { label: "2–3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
  { label: "No deadline", days: null },
];

function BriefUploadZone({ onUploaded, onCancel }: { onUploaded: (url: string, name: string) => void; onCancel: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
      "image/webp",
      "text/plain",
    ];

    if (file.size > maxSize) {
      alert("File too large. Maximum 20MB.");
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      alert("Unsupported file type. Upload a PDF, Word doc, image, or text file.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/brief-upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!data.ok) throw new Error(data.message || "Upload failed");

      onUploaded(data.storagePath, data.fileName);
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors duration-200 ${
        dragOver ? "border-brand bg-brand-muted" : "border-gray-200 bg-gray-50"
      }`}
    >
      {uploading ? (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          <span className="text-xs text-slate-600">Uploading...</span>
        </div>
      ) : (
        <>
          <Upload className="mx-auto h-5 w-5 text-slate-600" />
          <p className="mt-1 text-xs text-slate-600">
            Drag a file here or{" "}
            <label className="cursor-pointer text-brand hover:text-brand-hover transition-colors duration-200">
              browse
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </label>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-600">PDF, Word, image, or text. Max 20MB.</p>
          <button
            type="button"
            onClick={onCancel}
            className="mt-2 text-xs text-slate-600 cursor-pointer transition-colors duration-200 hover:text-slate-900"
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}

export function GigCreateForm({ initialTemplate, initialRepeatData, initialDraft, wizardData }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState(
    initialDraft?.title || initialRepeatData?.title || initialTemplate?.title || wizardData?.title || ""
  );
  const [description, setDescription] = useState(
    initialDraft?.description || initialRepeatData?.description || initialTemplate?.description || ""
  );
  const [deliverables, setDeliverables] = useState(
    initialDraft?.deliverables || initialRepeatData?.deliverables || initialTemplate?.deliverables || ""
  );
  const [category, setCategory] = useState<DealCategory | "">(
    (initialDraft?.category as DealCategory) ||
    (initialRepeatData?.category as DealCategory) ||
    (wizardData?.category as DealCategory) ||
    ""
  );
  const [otherCategoryDescription, setOtherCategoryDescription] = useState(
    initialDraft?.other_category_description || wizardData?.otherDescription || ""
  );
  const [paymentFrequency, setPaymentFrequency] = useState(
    initialDraft?.payment_frequency || wizardData?.frequency || "one_time"
  );
  const [isPublic, setIsPublic] = useState(() => {
    if (initialDraft?.deal_type) return initialDraft.deal_type === "public";
    if (wizardData) return false;
    return true;
  });
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [showDescriptionUpload, setShowDescriptionUpload] = useState(false);
  const [descriptionBriefUrl, setDescriptionBriefUrl] = useState<string | null>(initialDraft?.description_brief_url || null);
  const [descriptionBriefName, setDescriptionBriefName] = useState<string | null>(initialDraft?.description_brief_name || null);
  const [showDeliverablesUpload, setShowDeliverablesUpload] = useState(false);
  const [deliverablesBriefUrl, setDeliverablesBriefUrl] = useState<string | null>(initialDraft?.deliverables_brief_url || null);
  const [deliverablesBriefName, setDeliverablesBriefName] = useState<string | null>(initialDraft?.deliverables_brief_name || null);
  const [amount, setAmount] = useState(
    initialDraft?.total_amount
      ? (initialDraft.total_amount / 100).toString()
      : initialRepeatData?.total_amount
        ? (initialRepeatData.total_amount / 100).toString()
        : initialTemplate?.default_amount
          ? (initialTemplate.default_amount / 100).toString()
          : wizardData?.amount || ""
  );
  // ── Recover wizard data from sessionStorage (Google OAuth fallback) ──
  // The CreateWizard saves data to sessionStorage before Google OAuth redirects
  // the user off-site. URL params are lost during the OAuth chain, but
  // sessionStorage persists. This effect reads it back on mount.
  useEffect(() => {
    // Only recover if we don't already have wizard data from URL params
    const hasWizardData = !!(wizardData?.title || wizardData?.category || wizardData?.amount);
    if (hasWizardData) return;

    try {
      const stored = sessionStorage.getItem("checkhire_wizard_data");
      if (!stored) return;

      const params = new URLSearchParams(stored);
      const isFromWizard = params.get("from_wizard") === "1";
      if (!isFromWizard) return;

      // Apply recovered data to form state
      const recoveredTitle = params.get("title");
      const recoveredCategory = params.get("category");
      const recoveredAmount = params.get("amount");
      const recoveredOtherDesc = params.get("other_desc");
      const recoveredFrequency = params.get("frequency");

      if (recoveredTitle) setTitle(recoveredTitle);
      if (recoveredCategory) setCategory(recoveredCategory as DealCategory);
      if (recoveredAmount) setAmount(recoveredAmount);
      if (recoveredOtherDesc) setOtherCategoryDescription(recoveredOtherDesc);
      if (recoveredFrequency) setPaymentFrequency(recoveredFrequency);
      const recoveredDealType = params.get("deal_type");
      if (recoveredDealType === "private") setIsPublic(false);
      if (recoveredDealType === "public") setIsPublic(true);

      // Clear sessionStorage after recovery — one-time use
      sessionStorage.removeItem("checkhire_wizard_data");
    } catch {
      // sessionStorage unavailable — no recovery possible
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<
    { evidence_type: string; description: string }[]
  >([{ evidence_type: "file", description: "" }]);
  const [screeningQuestions, setScreeningQuestions] = useState<
    {
      id: string;
      type: "yes_no" | "short_text" | "multiple_choice";
      text: string;
      options: string[];
      dealbreaker_answer: string;
    }[]
  >((initialDraft?.screening_questions as {
    id: string;
    type: "yes_no" | "short_text" | "multiple_choice";
    text: string;
    options: string[];
    dealbreaker_answer: string;
  }[]) || []);
  const [maxApplicants, setMaxApplicants] = useState<number>(
    initialDraft?.max_applicants && [15, 30, 50].includes(initialDraft.max_applicants)
      ? initialDraft.max_applicants
      : 15
  );
  const [hasMilestones, setHasMilestones] = useState(
    initialDraft?.has_milestones || initialTemplate?.has_milestones || false
  );
  const [milestones, setMilestones] = useState<MilestoneFormItem[]>(
    initialTemplate?.milestone_templates?.length
      ? initialTemplate.milestone_templates.map((mt) => ({
          title: mt.title,
          description: mt.description,
          amount: initialTemplate.default_amount
            ? ((initialTemplate.default_amount * mt.amount_percentage) / 10000).toFixed(2)
            : "",
        }))
      : [
          { title: "", description: "", amount: "" },
          { title: "", description: "", amount: "" },
        ]
  );
  const [deadline, setDeadline] = useState(() => {
    if (initialDraft?.deadline) return initialDraft.deadline.split("T")[0];
    if (initialTemplate?.default_deadline_days) {
      const d = new Date();
      d.setDate(d.getDate() + initialTemplate.default_deadline_days);
      return d.toISOString().split("T")[0];
    }
    return "";
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<number | null | "custom">(() => {
    // If there's an existing deadline, try to match it to a preset
    if (initialDraft?.deadline || initialTemplate?.default_deadline_days) {
      return "custom"; // Existing dates show as custom
    }
    return null; // Default: no selection yet (will be set by user)
  });
  const [customDeadline, setCustomDeadline] = useState("");

  // UI state
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState("");
  const [errorLink, setErrorLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id || null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<number | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showReferralField, setShowReferralField] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [userProfile, setUserProfile] = useState<{ referred_by: string | null } | null>(null);

  const totalAmountDollars = parseFloat(amount) || 0;

  // ── Auto-save draft to database (debounced, every 30 seconds) ──
  useEffect(() => {
    // Don't auto-save if loaded from a template, repeat deal, or wizard redirect
    if (initialTemplate || initialRepeatData) return;
    // Don't auto-save if the form has no meaningful content
    if (!title.trim() && !description.trim()) return;
    // Don't auto-save while a manual submit or save is in progress
    if (submitting) return;

    const timer = setTimeout(async () => {
      // Only auto-save if the user has typed something meaningful
      if (!title.trim() || title.trim().length < 3) return;

      setAutoSaving(true);
      try {
        const totalCents = Math.round(totalAmountDollars * 100);
        const body = {
          title: title.trim() || "Untitled Draft",
          description: description.trim(),
          deliverables: deliverables.trim() || null,
          description_brief_url: descriptionBriefUrl || null,
          deliverables_brief_url: deliverablesBriefUrl || null,
          total_amount: totalCents || 1000,
          category: category || null,
          other_category_description: category === "other" ? otherCategoryDescription.trim() : null,
          payment_frequency: paymentFrequency,
          deadline: deadline || null,
          deal_type: isPublic ? "public" : "private",
          max_applicants: maxApplicants,
          has_milestones: hasMilestones,
          is_draft: true,
          acceptance_criteria: acceptanceCriteria
            .filter((c) => c.description.trim())
            .map((c) => ({
              evidence_type: c.evidence_type,
              description: c.description.trim(),
            })),
          milestones: hasMilestones
            ? milestones
                .filter((m) => m.title.trim())
                .map((m) => ({
                  title: m.title.trim(),
                  description: m.description.trim() || undefined,
                  amount: Math.round((parseFloat(m.amount) || 0) * 100),
                }))
            : null,
          template_id: null,
          screening_questions: screeningQuestions
            .filter((q) => q.text.trim())
            .map((q) => ({
              id: q.id,
              type: q.type,
              text: q.text.trim(),
              options: q.type === "multiple_choice" ? q.options.filter((o) => o.trim()) : undefined,
              dealbreaker_answer: q.dealbreaker_answer || undefined,
            })),
        };

        const url = draftId ? `/api/deals/${draftId}` : "/api/deals";
        const method = draftId ? "PATCH" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.ok) {
          if (!draftId && data.deal?.id) {
            setDraftId(data.deal.id);
            window.history.replaceState(null, "", `/deal/new?draft=${data.deal.id}`);
          }
          setLastAutoSaved(Date.now());
        }
      } catch {
        // Silent — auto-save failure shouldn't interrupt the user
      } finally {
        setAutoSaving(false);
      }
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [
    title, description, deliverables, category, otherCategoryDescription,
    paymentFrequency, isPublic, amount, deadline, hasMilestones, milestones,
    acceptanceCriteria, screeningQuestions,
    maxApplicants,
    descriptionBriefUrl, deliverablesBriefUrl,
    draftId, initialTemplate, initialRepeatData, submitting,
    totalAmountDollars,
  ]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("referred_by")
        .eq("id", userId)
        .maybeSingle();
      setUserProfile({ referred_by: profile?.referred_by ?? null });
    });
  }, []);

  const validateStep = (): boolean => {
    setError("");
    switch (step) {
      case 0:
        if (!title.trim()) { setError("Title is required"); return false; }
        if (title.length > 100) { setError("Title too long (max 100)"); return false; }
        if (!description.trim() && !descriptionBriefUrl) { setError("Description is required"); return false; }
        if (!deliverables.trim() && !deliverablesBriefUrl) { setError("Deliverables are required"); return false; }
        if (category === "other" && otherCategoryDescription.trim().length < 10) {
          setError("Please describe the type of work (at least 10 characters)");
          return false;
        }
        if (acceptanceCriteria.length === 0) {
          setError("At least one proof of completion requirement is needed");
          return false;
        }
        if (acceptanceCriteria.some((c) => c.description.trim().length < 3)) {
          setError("All proof of completion items need a description (at least 3 characters)");
          return false;
        }
        return true;
      case 1:
        if (!amount || totalAmountDollars < 10) { setError("Minimum $10"); return false; }
        if (totalAmountDollars > 10000) { setError("Maximum $10,000"); return false; }
        if (hasMilestones) {
          if (milestones.length < 2) { setError("At least 2 milestones required"); return false; }
          const sum = milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0);
          if (Math.abs(sum - totalAmountDollars) > 0.01) {
            setError("Milestone amounts must equal total budget");
            return false;
          }
          if (milestones.some((m) => !m.title.trim())) {
            setError("All milestones need a title");
            return false;
          }
          if (milestones.some((m) => (parseFloat(m.amount) || 0) < 1)) {
            setError("Minimum $1 per milestone");
            return false;
          }
        }
        if (deadline) {
          const deadlineDate = new Date(deadline);
          if (deadlineDate <= new Date()) {
            setError("Deadline must be in the future");
            return false;
          }
        }
        return true;
      case 2:
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (!validateStep()) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, 2));
  };

  const goBack = () => {
    setError("");
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const goToStep = (s: number) => {
    setError("");
    setDirection(s > step ? 1 : -1);
    setStep(s);
  };

  const handleSubmit = async () => {
    if (submitting) return; // Prevent double-submit
    setError("");
    setSubmitting(true);

    const totalCents = Math.round(totalAmountDollars * 100);
    const body = {
      ...(draftId ? { action: "publish_draft" } : {}),
      title: title.trim(),
      description: description.trim(),
      deliverables: deliverables.trim(),
      description_brief_url: descriptionBriefUrl || null,
      deliverables_brief_url: deliverablesBriefUrl || null,
      total_amount: totalCents,
      category: category || null,
      other_category_description: category === "other" ? otherCategoryDescription.trim() : null,
      payment_frequency: paymentFrequency,
      deadline: deadline || null,
      deal_type: isPublic ? "public" : "private",
      recipient_email: !isPublic && recipientEmail.trim() ? recipientEmail.trim() : null,
      recipient_name: !isPublic && recipientName.trim() ? recipientName.trim() : null,
      max_applicants: maxApplicants,
      has_milestones: hasMilestones,
      acceptance_criteria: acceptanceCriteria.map((c) => ({
        evidence_type: c.evidence_type,
        description: c.description.trim(),
      })),
      milestones: hasMilestones
        ? milestones.map((m) => ({
            title: m.title.trim(),
            description: m.description.trim() || undefined,
            amount: Math.round((parseFloat(m.amount) || 0) * 100),
          }))
        : null,
      template_id: initialTemplate?.id || null,
      referral_code: referralCodeInput || undefined,
      screening_questions: screeningQuestions
        .filter((q) => q.text.trim())
        .map((q) => ({
          id: q.id,
          type: q.type,
          text: q.text.trim(),
          options:
            q.type === "multiple_choice"
              ? q.options.filter((o) => o.trim())
              : undefined,
          dealbreaker_answer: q.dealbreaker_answer || undefined,
        })),
    };

    try {
      const res = await fetch(draftId ? `/api/deals/${draftId}` : "/api/deals", {
        method: draftId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Failed to create gig");
        setErrorLink(data.link || "");
        setSubmitting(false);
        return;
      }
      router.push(`/deal/${data.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create gig");
      setErrorLink("");
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setError("");
    setSubmitting(true);

    const totalCents = Math.round(totalAmountDollars * 100);
    const body = {
      title: title.trim() || "Untitled Draft",
      description: description.trim(),
      deliverables: deliverables.trim() || null,
      description_brief_url: descriptionBriefUrl || null,
      deliverables_brief_url: deliverablesBriefUrl || null,
      total_amount: totalCents || 1000,
      category: category || null,
      other_category_description: category === "other" ? otherCategoryDescription.trim() : null,
      payment_frequency: paymentFrequency,
      deadline: deadline || null,
      deal_type: isPublic ? "public" : "private",
      max_applicants: maxApplicants,
      has_milestones: hasMilestones,
      is_draft: true,
      acceptance_criteria: acceptanceCriteria
        .filter((c) => c.description.trim())
        .map((c) => ({
          evidence_type: c.evidence_type,
          description: c.description.trim(),
        })),
      milestones: hasMilestones
        ? milestones
            .filter((m) => m.title.trim())
            .map((m) => ({
              title: m.title.trim(),
              description: m.description.trim() || undefined,
              amount: Math.round((parseFloat(m.amount) || 0) * 100),
            }))
        : null,
      template_id: initialTemplate?.id || null,
      screening_questions: screeningQuestions
        .filter((q) => q.text.trim())
        .map((q) => ({
          id: q.id,
          type: q.type,
          text: q.text.trim(),
          options: q.type === "multiple_choice" ? q.options.filter((o) => o.trim()) : undefined,
          dealbreaker_answer: q.dealbreaker_answer || undefined,
        })),
    };

    try {
      const url = draftId ? `/api/deals/${draftId}` : "/api/deals";
      const method = draftId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Failed to save draft");
        setSubmitting(false);
        return;
      }
      toast("Draft saved", "success");
      if (!draftId) setDraftId(data.deal?.id || null);
      setSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
      setSubmitting(false);
    }
  };
  void handleSaveDraft; // Keep handler available for future UX flows.

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    const totalCents = Math.round(totalAmountDollars * 100);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_name: templateName.trim(),
          title: title.trim(),
          description: description.trim(),
          deliverables: deliverables.trim(),
          default_amount: totalCents || null,
          default_deadline_days: null,
          has_milestones: hasMilestones,
          milestone_templates: hasMilestones
            ? milestones.map((m) => ({
                title: m.title.trim(),
                description: m.description.trim(),
                amount_percentage:
                  totalAmountDollars > 0
                    ? Math.round(
                        ((parseFloat(m.amount) || 0) / totalAmountDollars) * 100
                      )
                    : 0,
              }))
            : [],
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast("Template saved!", "success");
      setTemplateDialogOpen(false);
      setTemplateName("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save template", "error");
    }
  };

  const handleTimeframeSelect = (days: number | null) => {
    setSelectedTimeframe(days);
    if (days === null) {
      setDeadline("");
    } else {
      const d = new Date();
      d.setDate(d.getDate() + days);
      setDeadline(d.toISOString().split("T")[0]);
    }
    setCustomDeadline("");
  };

  const handleCustomDeadline = (dateStr: string) => {
    setCustomDeadline(dateStr);
    setSelectedTimeframe("custom");
    setDeadline(dateStr);
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Full-screen overlay during deal creation */}
      {submitting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm"
        >
          <div className="text-center px-6">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
            <p className="mt-4 font-display text-lg font-semibold text-slate-900">
              Setting up your deal...
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {title}
            </p>
          </div>
        </motion.div>
      )}

      <h1 className="mb-2 text-center font-display text-2xl font-bold text-slate-900">
        {isPublic ? "Post a Gig" : "Create Payment Link"}
      </h1>

      {/* Deal type tabs */}
      <div className="mx-auto mb-2 flex max-w-xs rounded-lg border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setIsPublic(false)}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors duration-200 ${
            !isPublic
              ? "bg-brand-muted text-brand"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Link2 className="h-3.5 w-3.5" />
          Payment Link
        </button>
        <button
          type="button"
          onClick={() => setIsPublic(true)}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors duration-200 ${
            isPublic
              ? "bg-brand-muted text-brand"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          Public Gig
        </button>
      </div>
      <p className="mb-4 text-center text-xs text-slate-600">
        {isPublic
          ? "Post publicly — freelancers can find and apply"
          : "Create a private link to send to someone specific"}
      </p>

      {/* Progress dots */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEP_TITLES.map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors duration-200 ${
              i === step ? "bg-brand" : i < step ? "bg-brand/40" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <h2 className="mb-1 text-center font-display text-xl font-bold text-slate-900">
        {STEP_TITLES[step]}
      </h2>
      <p className="mb-6 text-center text-sm text-slate-600">
        {step === 0 && "Everything here becomes the agreement. If there’s a dispute, this is the evidence."}
        {step === 1 && "Budget, payment structure, and delivery timeline."}
        {step === 2 && "This is exactly what the other party will see. Make sure it’s right."}
      </p>
      {(autoSaving || lastAutoSaved) && (
        <p className="mb-4 text-center text-xs text-slate-600">
          {autoSaving ? "Saving draft..." : lastAutoSaved ? `Draft saved ${new Date(lastAutoSaved).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
        </p>
      )}

      {error && (
        <Alert variant="danger" className="mb-4">
          <p>{error}</p>
          {errorLink && (
            <Link
              href={errorLink}
              className="mt-1 inline-block cursor-pointer text-xs font-semibold text-red-700 underline transition-colors duration-200 hover:text-red-900"
            >
              Review our guidelines
            </Link>
          )}
        </Alert>
      )}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {/* Step 1 — What's the gig? */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Logo design for podcast brand"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Project description
                </label>
                <p className="mb-1.5 text-xs text-slate-600">Be specific. This is the record if there&apos;s a dispute.</p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What needs to be done? Include scope, timeline, and what &quot;done&quot; looks like."
                  maxLength={2000}
                  rows={4}
                  className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base md:text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-brand resize-none"
                />
                {!descriptionBriefUrl && (
                  <button
                    type="button"
                    onClick={() => setShowDescriptionUpload(true)}
                    className="mt-1.5 text-xs text-brand cursor-pointer transition-colors duration-200 hover:text-brand-hover"
                  >
                    Or upload a brief
                  </button>
                )}
                {showDescriptionUpload && !descriptionBriefUrl && (
                  <div className="mt-2">
                    <BriefUploadZone
                      onUploaded={(url, name) => {
                        setDescriptionBriefUrl(url);
                        setDescriptionBriefName(name);
                        setShowDescriptionUpload(false);
                      }}
                      onCancel={() => setShowDescriptionUpload(false)}
                    />
                  </div>
                )}
                {descriptionBriefUrl && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                    <Paperclip className="h-3.5 w-3.5 text-slate-600" />
                    <span className="text-xs text-slate-900 truncate flex-1">{descriptionBriefName}</span>
                    <button
                      type="button"
                      onClick={() => { setDescriptionBriefUrl(null); setDescriptionBriefName(null); }}
                      className="cursor-pointer text-slate-600 transition-colors duration-200 hover:text-slate-900"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Deliverables
                </label>
                <textarea
                  value={deliverables}
                  onChange={(e) => setDeliverables(e.target.value)}
                  placeholder="Final deliverables that trigger payment release"
                  maxLength={1000}
                  rows={3}
                  className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base md:text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-brand resize-none"
                />
                <p className="mt-1 text-xs text-slate-600">
                  Payment releases when these are done.
                </p>
                {!deliverablesBriefUrl && (
                  <button
                    type="button"
                    onClick={() => setShowDeliverablesUpload(true)}
                    className="mt-1 text-xs text-brand cursor-pointer transition-colors duration-200 hover:text-brand-hover"
                  >
                    Or upload a brief
                  </button>
                )}
                {showDeliverablesUpload && !deliverablesBriefUrl && (
                  <div className="mt-2">
                    <BriefUploadZone
                      onUploaded={(url, name) => {
                        setDeliverablesBriefUrl(url);
                        setDeliverablesBriefName(name);
                        setShowDeliverablesUpload(false);
                      }}
                      onCancel={() => setShowDeliverablesUpload(false)}
                    />
                  </div>
                )}
                {deliverablesBriefUrl && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                    <Paperclip className="h-3.5 w-3.5 text-slate-600" />
                    <span className="text-xs text-slate-900 truncate flex-1">{deliverablesBriefName}</span>
                    <button
                      type="button"
                      onClick={() => { setDeliverablesBriefUrl(null); setDeliverablesBriefName(null); }}
                      className="cursor-pointer text-slate-600 transition-colors duration-200 hover:text-slate-900"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Category
                </label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as DealCategory)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {category === "other" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="mt-3"
                  >
                    <label className="mb-1.5 block text-sm font-medium text-slate-900">
                      Describe the type of work
                    </label>
                    <Input
                      value={otherCategoryDescription}
                      onChange={(e) => setOtherCategoryDescription(e.target.value)}
                      placeholder="e.g., Data analysis for a research project"
                      maxLength={100}
                    />
                    <p className="mt-1 text-xs text-slate-600">
                      {otherCategoryDescription.length}/100
                    </p>
                  </motion.div>
                )}
              </div>
              {/* Proof of Completion */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  How is delivery verified?
                </label>
                <p className="mb-3 text-xs text-slate-600">
                  Add requirements so both sides agree.
                </p>
                <div className="space-y-3">
                  {acceptanceCriteria.map((criteria, i) => (
                    <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <Select
                        value={criteria.evidence_type}
                        onValueChange={(v) => {
                          const updated = [...acceptanceCriteria];
                          updated[i] = { ...updated[i], evidence_type: v };
                          setAcceptanceCriteria(updated);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-36 sm:shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="file">File upload</SelectItem>
                          <SelectItem value="screenshot">Screenshot</SelectItem>
                          <SelectItem value="link">Link / URL</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={criteria.description}
                        onChange={(e) => {
                          const updated = [...acceptanceCriteria];
                          updated[i] = { ...updated[i], description: e.target.value };
                          setAcceptanceCriteria(updated);
                        }}
                        placeholder="What proves the work is done?"
                        maxLength={200}
                        className="flex-1"
                      />
                      {acceptanceCriteria.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setAcceptanceCriteria(acceptanceCriteria.filter((_, idx) => idx !== i))}
                          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-lg text-slate-600 cursor-pointer transition-colors duration-200 hover:bg-gray-100 hover:text-slate-900"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {acceptanceCriteria.length < 10 && (
                  <button
                    type="button"
                    className="mt-2 flex items-center gap-1.5 text-sm text-brand cursor-pointer transition-colors duration-200 hover:text-brand-hover"
                    onClick={() =>
                      setAcceptanceCriteria([
                        ...acceptanceCriteria,
                        { evidence_type: "file", description: "" },
                      ])
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add proof requirement
                  </button>
                )}
                <p className="mt-2 text-xs text-slate-600">
                  Examples: final files, live website link, screenshots, or screen recordings.
                </p>
              </div>

              {/* Screening Questions (optional) — public gigs only */}
              {isPublic && (<div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Screening questions <span className="font-normal text-slate-600">(optional)</span>
                </label>
                <p className="mb-3 text-xs text-slate-600">
                  Add up to 5 questions to filter applicants. Mark dealbreaker answers to flag mismatches.
                </p>

                {screeningQuestions.length > 0 && (
                  <div className="mb-3 space-y-3">
                    {screeningQuestions.map((q, i) => (
                      <div key={q.id} className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <Input
                              value={q.text}
                              onChange={(e) => {
                                const updated = [...screeningQuestions];
                                updated[i] = { ...updated[i], text: e.target.value };
                                setScreeningQuestions(updated);
                              }}
                              placeholder="e.g., Are you available to start within 7 days?"
                              maxLength={200}
                            />
                            <div className="flex items-center gap-2">
                              <Select
                                value={q.type}
                                onValueChange={(v) => {
                                  const updated = [...screeningQuestions];
                                  updated[i] = {
                                    ...updated[i],
                                    type: v as "yes_no" | "short_text" | "multiple_choice",
                                    options: v === "multiple_choice" ? ["", ""] : [],
                                    dealbreaker_answer: "",
                                  };
                                  setScreeningQuestions(updated);
                                }}
                              >
                                <SelectTrigger className="w-44">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="yes_no">Yes / No</SelectItem>
                                  <SelectItem value="short_text">Short Text</SelectItem>
                                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                </SelectContent>
                              </Select>

                              {q.type === "yes_no" && (
                                <Select
                                  value={q.dealbreaker_answer || "__none__"}
                                  onValueChange={(v) => {
                                    const updated = [...screeningQuestions];
                                    updated[i] = {
                                      ...updated[i],
                                      dealbreaker_answer: v === "__none__" ? "" : v,
                                    };
                                    setScreeningQuestions(updated);
                                  }}
                                >
                                  <SelectTrigger className="w-44">
                                    <SelectValue placeholder="Dealbreaker?" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">No dealbreaker</SelectItem>
                                    <SelectItem value="yes">Flag if &quot;Yes&quot;</SelectItem>
                                    <SelectItem value="no">Flag if &quot;No&quot;</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>

                            {q.type === "multiple_choice" && (
                              <div className="space-y-1.5">
                                {q.options.map((opt, oi) => (
                                  <div key={oi} className="flex items-center gap-2">
                                    <Input
                                      value={opt}
                                      onChange={(e) => {
                                        const updated = [...screeningQuestions];
                                        const opts = [...updated[i].options];
                                        opts[oi] = e.target.value;
                                        updated[i] = { ...updated[i], options: opts };
                                        setScreeningQuestions(updated);
                                      }}
                                      placeholder={`Option ${oi + 1}`}
                                      maxLength={100}
                                      className="flex-1"
                                    />
                                    {q.options.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...screeningQuestions];
                                          updated[i] = {
                                            ...updated[i],
                                            options: updated[i].options.filter((_, idx) => idx !== oi),
                                          };
                                          setScreeningQuestions(updated);
                                        }}
                                        className="shrink-0 cursor-pointer text-slate-600 transition-colors duration-200 hover:text-slate-900"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {q.options.length < 4 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...screeningQuestions];
                                      updated[i] = {
                                        ...updated[i],
                                        options: [...updated[i].options, ""],
                                      };
                                      setScreeningQuestions(updated);
                                    }}
                                    className="cursor-pointer text-xs text-brand transition-colors duration-200 hover:text-brand-hover"
                                  >
                                    + Add option
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setScreeningQuestions(
                                screeningQuestions.filter((_, idx) => idx !== i)
                              )
                            }
                            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors duration-200 hover:bg-gray-100 hover:text-slate-900"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {screeningQuestions.length < 5 && (
                  <button
                    type="button"
                    className="flex cursor-pointer items-center gap-1.5 text-sm text-brand transition-colors duration-200 hover:text-brand-hover"
                    onClick={() =>
                      setScreeningQuestions([
                        ...screeningQuestions,
                        {
                          id: `q${Date.now()}`,
                          type: "yes_no",
                          text: "",
                          options: [],
                          dealbreaker_answer: "",
                        },
                      ])
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add screening question
                  </button>
                )}
              </div>
              )}

              {/* Application limit — public gigs only */}
              {isPublic && (<div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Application limit
                </label>
                <p className="mb-3 text-xs text-slate-600">
                  How many applications do you want to receive? New applications close when the limit is reached. The gig stays visible.
                </p>
                <div className="flex gap-2">
                  {[15, 30, 50].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMaxApplicants(n)}
                      className={`flex-1 cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-semibold transition-colors duration-200 ${
                        maxApplicants === n
                          ? "border-brand bg-brand-muted text-brand"
                          : "border-gray-200 bg-white text-slate-900 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  {maxApplicants === 15 && "Good for most gigs — fills fast, easy to review."}
                  {maxApplicants === 30 && "Larger projects — more options to choose from."}
                  {maxApplicants === 50 && "Cast a wide net — best for competitive or high-value gigs."}
                </p>
              </div>
              )}

              {/* Trust line */}
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                <Shield className="h-4 w-4 shrink-0 text-brand" />
                <p className="text-xs text-slate-600">
                  These terms are documented and timestamped. If there&apos;s a dispute, this is the evidence.
                </p>
              </div>
            </div>
          )}

          {/* Step 2 — How much? */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Budget
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">$</span>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="200.00"
                    min={10}
                    max={10000}
                    step="0.01"
                    className="w-full sm:w-40"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Payment structure
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setHasMilestones(false)}
                    className={`cursor-pointer rounded-xl border p-4 text-left transition-colors duration-200 ${
                      !hasMilestones
                        ? "border-brand bg-brand-muted"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">Pay all at once</p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Release full payment when work is complete
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasMilestones(true)}
                    className={`cursor-pointer rounded-xl border p-4 text-left transition-colors duration-200 ${
                      hasMilestones
                        ? "border-brand bg-brand-muted"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">Pay in stages</p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Split into checkpoints. Review work along the way.
                    </p>
                  </button>
                </div>
              </div>

              {hasMilestones && (
                <MilestoneBuilder
                  milestones={milestones}
                  setMilestones={setMilestones}
                  totalAmount={totalAmountDollars}
                />
              )}

              {/* Payment frequency */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">When should payment be released?</label>
                <p className="mb-2 text-xs text-slate-600">Payment is held securely and only released when the work is done.</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    { value: "one_time", label: "One-time", sub: "Release on completion" },
                    { value: "weekly", label: "Weekly", sub: "Every week" },
                    { value: "biweekly", label: "Biweekly", sub: "Every 2 weeks" },
                    { value: "monthly", label: "Monthly", sub: "Once a month" },
                  ].map((freq) => (
                    <button
                      key={freq.value}
                      type="button"
                      onClick={() => setPaymentFrequency(freq.value)}
                      className={`cursor-pointer rounded-xl border p-3 text-left transition-colors duration-200 ${
                        paymentFrequency === freq.value
                          ? "border-brand bg-brand-muted"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900">{freq.label}</p>
                      <p className="text-xs text-slate-600">{freq.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery timeframe */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Delivery timeframe
                </label>
                <p className="mb-2 text-xs text-slate-600">
                  How long should this gig take? The freelancer will see this as a deadline.
                </p>
                <div className="flex flex-wrap gap-2">
                  {TIMEFRAME_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleTimeframeSelect(opt.days)}
                      className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                        (opt.days === null && selectedTimeframe === null && deadline === "") ||
                        (opt.days !== null && selectedTimeframe === opt.days)
                          ? "border-brand bg-brand-muted text-brand"
                          : "border-gray-200 bg-white text-slate-900 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedTimeframe("custom")}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                      selectedTimeframe === "custom"
                        ? "border-brand bg-brand-muted text-brand"
                        : "border-gray-200 bg-white text-slate-900 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Custom date
                  </button>
                </div>
                {selectedTimeframe === "custom" && (
                  <div className="mt-2">
                    <Input
                      type="date"
                      value={customDeadline}
                      onChange={(e) => handleCustomDeadline(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                )}
                {deadline && selectedTimeframe !== "custom" && selectedTimeframe !== null && (
                  <p className="mt-1.5 text-xs text-slate-600">
                    Deadline will be set to {new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3 — Review & Post */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                {/* Title */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-600">Title</p>
                    <p className="text-base font-semibold text-slate-900">
                      {title}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(0)}
                    className="cursor-pointer text-slate-600 transition-colors duration-200 hover:text-slate-900"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs text-slate-600">Project Details</p>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">
                    {description}
                  </p>
                  {descriptionBriefUrl && (
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 text-slate-600" />
                      <span className="text-xs text-slate-600">Brief attached: {descriptionBriefName}</span>
                    </div>
                  )}
                </div>

                {/* Deliverables */}
                <div>
                  <p className="text-xs text-slate-600">Deliverables</p>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">
                    {deliverables}
                  </p>
                  {deliverablesBriefUrl && (
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 text-slate-600" />
                      <span className="text-xs text-slate-600">Brief attached: {deliverablesBriefName}</span>
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-600">Budget</p>
                    <p className="font-mono text-xl font-semibold tabular-nums text-slate-900">
                      ${totalAmountDollars.toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="cursor-pointer text-slate-600 transition-colors duration-200 hover:text-slate-900"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                {/* Milestones */}
                {hasMilestones && (
                  <div>
                    <p className="text-xs text-slate-600 mb-2">Milestones</p>
                    {milestones.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm text-slate-900">
                          {i + 1}. {m.title}
                        </span>
                        <span className="font-mono text-sm tabular-nums text-slate-600">
                          ${parseFloat(m.amount || "0").toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Acceptance Criteria */}
                <div>
                  <p className="text-xs text-slate-600 mb-2">Completion requirements</p>
                  {acceptanceCriteria.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <span className="text-xs font-semibold text-slate-600 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
                        {c.evidence_type === "file" ? "File" : c.evidence_type === "screenshot" ? "Screenshot" : c.evidence_type === "link" ? "Link" : c.evidence_type === "video" ? "Video" : "Text"}
                      </span>
                      <span className="text-sm text-slate-900">{c.description}</span>
                    </div>
                  ))}
                </div>

                {/* Category */}
                {category && (
                  <div>
                    <p className="text-xs text-slate-600">Category</p>
                    <Badge variant="outline">
                      {DEAL_CATEGORIES.find((c) => c.value === category)?.label}
                    </Badge>
                  </div>
                )}

                {screeningQuestions.filter((q) => q.text.trim()).length > 0 && (
                  <div>
                    <p className="mb-2 text-xs text-slate-600">Screening Questions</p>
                    {screeningQuestions
                      .filter((q) => q.text.trim())
                      .map((q, i) => (
                        <div key={q.id} className="flex items-center justify-between py-1">
                          <span className="text-sm text-slate-900">
                            {i + 1}. {q.text}
                          </span>
                          <Badge variant="outline">
                            {q.type === "yes_no"
                              ? "Yes/No"
                              : q.type === "short_text"
                                ? "Text"
                                : "Choice"}
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}

                {/* Payment Frequency */}
                {paymentFrequency !== "one_time" && (
                  <div>
                    <p className="text-xs text-slate-600">Payment Frequency</p>
                    <Badge variant="outline">
                      {paymentFrequency === "weekly" ? "Weekly" : paymentFrequency === "biweekly" ? "Biweekly" : "Monthly"}
                    </Badge>
                  </div>
                )}

                {/* Other Category Description */}
                {category === "other" && otherCategoryDescription && (
                  <div>
                    <p className="text-xs text-slate-600">Service Description</p>
                    <p className="text-sm text-slate-900">{otherCategoryDescription}</p>
                  </div>
                )}

                {/* Deadline */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-600">Delivery timeframe</p>
                    <p className="text-sm text-slate-900">
                      {deadline
                        ? `Due ${new Date(deadline).toLocaleDateString()}`
                        : "No deadline — flexible"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="cursor-pointer text-slate-600 transition-colors duration-200 hover:text-slate-900"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

              </div>

              {/* Recipient — private deals only */}
              {!isPublic && (
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-brand" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Who are you sending this to?
                    </h3>
                  </div>
                  <p className="mb-4 text-xs text-slate-600">
                    Optional. If you add their email, we&apos;ll send them the
                    payment link automatically after you create the deal.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Their name
                      </label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="e.g., Sarah from Acme Brand"
                        maxLength={100}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Their email
                      </label>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="e.g., sarah@acmebrand.com"
                        maxLength={255}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Referral Code — only show if user has no referrer */}
              {!userProfile?.referred_by && (
                <div className="pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowReferralField(!showReferralField)}
                    className="text-sm text-slate-600 cursor-pointer transition-colors duration-200 hover:text-slate-900"
                  >
                    Have a referral code?
                  </button>
                  {showReferralField && (
                    <div className="mt-2">
                      <Input
                        placeholder="e.g. REF-7X4K2M"
                        value={referralCodeInput}
                        onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                        className="max-w-xs"
                      />
                      <p className="text-xs text-slate-600 mt-1">
                        Enter the code of the person who referred you to CheckHire.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating your deal...
                    </>
                  ) : (
                    "Create Deal Link"
                  )}
                </Button>
                {!submitting && (
                  <button
                    type="button"
                    onClick={() => setTemplateDialogOpen(true)}
                    className="w-full cursor-pointer text-center text-xs text-slate-600 transition-colors duration-200 hover:text-slate-900"
                  >
                    Save this setup as a reusable template
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      {step < 2 && (
        <div className="mt-8 mb-6 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={goBack}>
              Back
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={goNext}>Continue</Button>
        </div>
      )}

      {step === 2 && step > 0 && (
        <div className="mt-4 mb-6">
          <Button variant="ghost" onClick={goBack}>
            Back
          </Button>
        </div>
      )}

      {/* Save Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader title="Save as Template" description="Give this template a name so you can reuse it later." />
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name"
            maxLength={50}
          />
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
