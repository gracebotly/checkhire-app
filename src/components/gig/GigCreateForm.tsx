"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Globe, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { DealTemplate, DealCategory } from "@/types/database";

type RepeatDealData = {
  title: string;
  description: string;
  deliverables: string | null;
  total_amount: number;
  category: string | null;
};

type Props = {
  initialTemplate?: DealTemplate | null;
  initialRepeatData?: RepeatDealData | null;
  wizardData?: {
    category: string | null;
    title: string | null;
    amount: string | null;
    otherDescription: string | null;
    frequency: string | null;
  } | null;
};

const STEP_TITLES = [
  "What's the gig?",
  "How much?",
  "When?",
  "Who can see this?",
  "Review & Post",
];

export function GigCreateForm({ initialTemplate, initialRepeatData, wizardData }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState(
    initialRepeatData?.title || initialTemplate?.title || wizardData?.title || ""
  );
  const [description, setDescription] = useState(
    initialRepeatData?.description || initialTemplate?.description || ""
  );
  const [deliverables, setDeliverables] = useState(
    initialRepeatData?.deliverables || initialTemplate?.deliverables || ""
  );
  const [category, setCategory] = useState<DealCategory | "">(
    (initialRepeatData?.category as DealCategory) ||
    (wizardData?.category as DealCategory) ||
    ""
  );
  const [otherCategoryDescription, setOtherCategoryDescription] = useState(
    wizardData?.otherDescription || ""
  );
  const [paymentFrequency, setPaymentFrequency] = useState(
    wizardData?.frequency || "one_time"
  );
  const [amount, setAmount] = useState(
    initialRepeatData?.total_amount
      ? (initialRepeatData.total_amount / 100).toString()
      : initialTemplate?.default_amount
        ? (initialTemplate.default_amount / 100).toString()
        : wizardData?.amount || ""
  );
  const [hasMilestones, setHasMilestones] = useState(
    initialTemplate?.has_milestones || false
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
    if (initialTemplate?.default_deadline_days) {
      const d = new Date();
      d.setDate(d.getDate() + initialTemplate.default_deadline_days);
      return d.toISOString().split("T")[0];
    }
    return "";
  });
  const [dealType, setDealType] = useState<"private" | "public">("private");

  // UI state
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState("");
  const [errorLink, setErrorLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const totalAmountDollars = parseFloat(amount) || 0;

  const validateStep = (): boolean => {
    setError("");
    switch (step) {
      case 0:
        if (!title.trim()) { setError("Title is required"); return false; }
        if (title.length > 100) { setError("Title too long (max 100)"); return false; }
        if (!description.trim()) { setError("Description is required"); return false; }
        if (!deliverables.trim()) { setError("Deliverables are required"); return false; }
        if (category === "other" && otherCategoryDescription.trim().length < 10) {
          setError("Please describe the type of work (at least 10 characters)");
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
        return true;
      case 2:
        if (deadline) {
          const deadlineDate = new Date(deadline);
          if (deadlineDate <= new Date()) {
            setError("Deadline must be in the future");
            return false;
          }
        }
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (!validateStep()) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, 4));
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
    setError("");
    setSubmitting(true);

    const totalCents = Math.round(totalAmountDollars * 100);
    const body = {
      title: title.trim(),
      description: description.trim(),
      deliverables: deliverables.trim(),
      total_amount: totalCents,
      category: category || null,
      other_category_description: category === "other" ? otherCategoryDescription.trim() : null,
      payment_frequency: paymentFrequency,
      deadline: deadline || null,
      deal_type: dealType,
      has_milestones: hasMilestones,
      milestones: hasMilestones
        ? milestones.map((m) => ({
            title: m.title.trim(),
            description: m.description.trim() || undefined,
            amount: Math.round((parseFloat(m.amount) || 0) * 100),
          }))
        : null,
      template_id: initialTemplate?.id || null,
    };

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
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
    } finally {
      setSubmitting(false);
    }
  };

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

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="mx-auto max-w-2xl">
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

      <h2 className="mb-6 text-center font-display text-xl font-bold text-slate-900">
        {STEP_TITLES[step]}
      </h2>

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
                  placeholder="e.g., Design a logo for my podcast"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the gig in detail..."
                  maxLength={2000}
                  rows={4}
                  className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-brand resize-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  What will you receive?
                </label>
                <textarea
                  value={deliverables}
                  onChange={(e) => setDeliverables(e.target.value)}
                  placeholder="e.g., 3 logo concepts in AI + PNG, 2 rounds of revisions"
                  maxLength={1000}
                  rows={3}
                  className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-brand resize-none"
                />
                <p className="mt-1 text-xs text-slate-600">
                  Be specific — this is what counts if there&apos;s a dispute.
                </p>
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
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">Payment frequency</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "one_time", label: "One-time" },
                    { value: "weekly", label: "Weekly" },
                    { value: "biweekly", label: "Biweekly" },
                    { value: "monthly", label: "Monthly" },
                  ].map((freq) => (
                    <button
                      key={freq.value}
                      type="button"
                      onClick={() => setPaymentFrequency(freq.value)}
                      className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors duration-200 ${
                        paymentFrequency === freq.value
                          ? "border-brand bg-brand-muted"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900">{freq.label}</p>
                    </button>
                  ))}
                </div>
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
                    className="w-40"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Minimum $10, maximum $10,000
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="milestones"
                  checked={hasMilestones}
                  onCheckedChange={(checked) =>
                    setHasMilestones(checked === true)
                  }
                />
                <label
                  htmlFor="milestones"
                  className="cursor-pointer text-sm font-medium text-slate-900"
                >
                  Split into milestones
                </label>
              </div>

              {hasMilestones && (
                <MilestoneBuilder
                  milestones={milestones}
                  setMilestones={setMilestones}
                  totalAmount={totalAmountDollars}
                />
              )}
            </div>
          )}

          {/* Step 3 — When? */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Deadline
                </label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-600">
                  Leave blank if there&apos;s no fixed deadline
                </p>
              </div>
            </div>
          )}

          {/* Step 4 — Who can see this? */}
          {step === 3 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setDealType("private")}
                className={`flex w-full cursor-pointer items-start gap-4 rounded-xl border p-5 text-left transition-colors duration-200 ${
                  dealType === "private"
                    ? "border-brand bg-brand-muted"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <Lock className="mt-0.5 h-5 w-5 text-slate-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Private
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Share a link with a specific person. Only they can
                    accept the gig.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDealType("public")}
                className={`flex w-full cursor-pointer items-start gap-4 rounded-xl border p-5 text-left transition-colors duration-200 ${
                  dealType === "public"
                    ? "border-brand bg-brand-muted"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <Globe className="mt-0.5 h-5 w-5 text-slate-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Public
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Open for anyone to apply. Review pitches and pick the
                    best fit.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Step 5 — Review & Post */}
          {step === 4 && (
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
                  <p className="text-xs text-slate-600">Description</p>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">
                    {description}
                  </p>
                </div>

                {/* Deliverables */}
                <div>
                  <p className="text-xs text-slate-600">Deliverables</p>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">
                    {deliverables}
                  </p>
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

                {/* Category */}
                {category && (
                  <div>
                    <p className="text-xs text-slate-600">Category</p>
                    <Badge variant="outline">
                      {DEAL_CATEGORIES.find((c) => c.value === category)?.label}
                    </Badge>
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
                    <p className="text-xs text-slate-600">Deadline</p>
                    <p className="text-sm text-slate-900">
                      {deadline
                        ? new Date(deadline).toLocaleDateString()
                        : "No deadline"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="cursor-pointer text-slate-600 transition-colors duration-200 hover:text-slate-900"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                {/* Visibility */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-600">Visibility</p>
                    <p className="text-sm text-slate-900">
                      {dealType === "private" ? "Private" : "Public"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="cursor-pointer text-slate-600 transition-colors duration-200 hover:text-slate-900"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? "Posting..." : "Post Gig"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplateDialogOpen(true)}
                >
                  Save as Template
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      {step < 4 && (
        <div className="mt-8 flex items-center justify-between">
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

      {step === 4 && step > 0 && (
        <div className="mt-4">
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
