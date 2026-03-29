"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, ArrowRight, Send, AlertTriangle } from "lucide-react";
import { ListingFormProgress } from "@/components/employer/ListingFormProgress";
import { JOB_CATEGORIES } from "@/lib/validation/listingSchema";
import { detectBlockedKeyword } from "@/lib/validation/screeningSchema";
import { QuestionTemplateSelector } from "@/components/employer/QuestionTemplateSelector";
import type { CommissionStructure, QuestionTemplateEntry, VideoQuestion } from "@/types/database";

// ─── Form State Types ───
type ScreeningQ = {
  question_text: string;
  question_type: "multiple_choice" | "short_answer" | "yes_no" | "numerical";
  options: string[];
  required: boolean;
  is_knockout: boolean;
  knockout_answer: string;
  point_value: number;
  min_length: number | string;
};

type FormData = {
  // Step 1 — Job Details
  title: string;
  description: string;
  job_type: string;
  category: string;
  remote_type: string;
  location_city: string;
  location_state: string;
  location_country: string;
  timezone_requirements: string;
  equipment_policy: string;
  // Step 2 — Compensation
  pay_type: string;
  salary_min: string;
  salary_max: string;
  is_100_percent_commission: boolean;
  commission_percentage: string;
  commission_basis: string;
  average_earnings: string;
  time_to_first_payment: string;
  leads_provided: boolean;
  ote_min: string;
  ote_max: string;
  // Step 3 — Requirements
  respond_by_date: string;
  fill_by_date: string;
  max_applications: string;
  requires_video_application: boolean;
  // Step 3 addition — Video Questions
  video_questions: VideoQuestion[];
  // Step 4 — Screening
  screening_questions: ScreeningQ[];
};

const INITIAL_FORM: FormData = {
  title: "",
  description: "",
  job_type: "full_time",
  category: "",
  remote_type: "full_remote",
  location_city: "",
  location_state: "",
  location_country: "US",
  timezone_requirements: "",
  equipment_policy: "",
  pay_type: "salary",
  salary_min: "",
  salary_max: "",
  is_100_percent_commission: false,
  commission_percentage: "",
  commission_basis: "",
  average_earnings: "",
  time_to_first_payment: "",
  leads_provided: false,
  ote_min: "",
  ote_max: "",
  respond_by_date: "",
  fill_by_date: "",
  max_applications: "100",
  requires_video_application: false,
  video_questions: [],
  screening_questions: [],
};

// Default respond_by: 14 days from now
function defaultRespondBy(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}

// Default fill_by: 30 days from now
function defaultFillBy(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

export function ListingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    ...INITIAL_FORM,
    respond_by_date: defaultRespondBy(),
    fill_by_date: defaultFillBy(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // ─── Step Validation ───
  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};

    if (s === 0) {
      if (form.title.trim().length < 5) errs.title = "Title must be at least 5 characters";
      if (form.description.trim().length < 50) errs.description = "Description must be at least 50 characters";
      if (!form.category) errs.category = "Please select a category";
      if (form.remote_type !== "full_remote" && !form.location_city && !form.location_state) {
        errs.location_city = "Location is required for non-remote roles";
      }
    }

    if (s === 1) {
      if (form.pay_type !== "commission" && !form.is_100_percent_commission) {
        if (!form.salary_min && !form.salary_max) {
          errs.salary_min = "Salary range is required";
        }
      }
      if (form.salary_min && form.salary_max) {
        if (Number(form.salary_max) < Number(form.salary_min)) {
          errs.salary_max = "Maximum must be greater than minimum";
        }
      }
    }

    // Step 3 (screening) — check for blocked keywords
    if (s === 3) {
      for (let i = 0; i < form.screening_questions.length; i++) {
        const q = form.screening_questions[i];
        const blocked = detectBlockedKeyword(q.question_text);
        if (blocked) {
          errs[`question_${i}`] = `Contains prohibited keyword: "${blocked}"`;
        }
        if (q.question_text.trim().length < 5) {
          errs[`question_${i}`] = "Question must be at least 5 characters";
        }
        if (q.question_type === "multiple_choice" && q.options.filter(Boolean).length < 2) {
          errs[`question_${i}_options`] = "Multiple choice needs at least 2 options";
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, 4));
    }
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  // ─── Submit ───
  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    setSubmitting(true);
    setSubmitError(null);

    const commissionStructure: CommissionStructure | null =
      form.pay_type === "commission" || form.is_100_percent_commission
        ? {
            commission_percentage: form.commission_percentage ? Number(form.commission_percentage) : undefined,
            commission_basis: form.commission_basis || undefined,
            average_earnings: form.average_earnings ? Number(form.average_earnings) : undefined,
            time_to_first_payment: form.time_to_first_payment || undefined,
            leads_provided: form.leads_provided,
          }
        : null;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      job_type: form.job_type,
      category: form.category,
      pay_type: form.pay_type,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
      commission_structure: commissionStructure,
      ote_min: form.ote_min ? Number(form.ote_min) : null,
      ote_max: form.ote_max ? Number(form.ote_max) : null,
      is_100_percent_commission: form.is_100_percent_commission,
      remote_type: form.remote_type,
      location_city: form.location_city.trim() || undefined,
      location_state: form.location_state.trim() || undefined,
      location_country: form.location_country,
      timezone_requirements: form.timezone_requirements.trim() || undefined,
      equipment_policy: form.equipment_policy.trim() || undefined,
      respond_by_date: form.respond_by_date || undefined,
      fill_by_date: form.fill_by_date || undefined,
      max_applications: Number(form.max_applications) || 100,
      requires_video_application: form.requires_video_application,
      video_questions: form.requires_video_application ? form.video_questions.filter((vq) => vq.prompt.trim()) : [],
      screening_questions: form.screening_questions.map((q, i) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.question_type === "multiple_choice" ? q.options.filter(Boolean) : null,
        required: q.required,
        sort_order: i,
        is_knockout: q.is_knockout,
        knockout_answer: q.is_knockout ? q.knockout_answer : null,
        point_value: Number(q.point_value) || 0,
        min_length: q.question_type === "short_answer" && q.min_length ? Number(q.min_length) : null,
      })),
    };

    try {
      const res = await fetch("/api/employer/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.ok) {
        router.push(`/employer/listings?created=${data.listing.slug}`);
        router.refresh();
      } else {
        setSubmitError(data.message || "Failed to create listing.");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    }

    setSubmitting(false);
  };

  // ─── Add/Remove Screening Questions ───
  const addQuestion = () => {
    update("screening_questions", [
      ...form.screening_questions,
      {
        question_text: "",
        question_type: "short_answer" as const,
        options: ["", ""],
        required: true,
        is_knockout: false,
        knockout_answer: "",
        point_value: 0,
        min_length: "",
      },
    ]);
  };

  const loadTemplate = (questions: QuestionTemplateEntry[]) => {
    const mapped: ScreeningQ[] = questions.map((q) => ({
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options || ["", ""],
      required: true,
      is_knockout: q.is_knockout || false,
      knockout_answer: q.knockout_answer || "",
      point_value: q.point_value || 0,
      min_length: q.min_length || "",
    }));
    update("screening_questions", mapped);
  };

  const addVideoQuestion = () => {
    if (form.video_questions.length >= 5) return;
    update("video_questions", [
      ...form.video_questions,
      { prompt: "", time_limit_seconds: 60, max_retakes: 1 },
    ]);
  };

  const removeVideoQuestion = (index: number) => {
    update("video_questions", form.video_questions.filter((_, i) => i !== index));
  };

  const updateVideoQuestion = (index: number, field: string, value: unknown) => {
    const updated = [...form.video_questions];
    updated[index] = { ...updated[index], [field]: value };
    update("video_questions", updated);
  };

  const removeQuestion = (index: number) => {
    update(
      "screening_questions",
      form.screening_questions.filter((_, i) => i !== index)
    );
  };

  const updateQuestion = (index: number, field: string, value: unknown) => {
    const updated = [...form.screening_questions];
    updated[index] = { ...updated[index], [field]: value };
    update("screening_questions", updated);
  };

  // ─── Input helper ───
  const inputClass = (field: string) =>
    `w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors duration-200 ${
      errors[field] ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-brand"
    }`;

  const labelClass = "mb-1 block text-xs font-medium text-slate-600";

  // ─── Render ───
  return (
    <div className="mx-auto max-w-2xl">
      <ListingFormProgress currentStep={step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="rounded-xl border border-gray-200 bg-white p-6"
        >
          {/* ── Step 0: Job Details ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Job Title</label>
                <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Senior React Engineer" maxLength={120} className={inputClass("title")} />
                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the role, responsibilities, qualifications, and what makes this opportunity great..." rows={8} maxLength={10000} className={inputClass("description")} />
                <div className="mt-1 flex justify-between">
                  {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
                  <span className={`ml-auto text-xs tabular-nums ${form.description.length >= 9000 ? "text-amber-600" : "text-slate-600"}`}>{form.description.length}/10,000</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <select value={form.category} onChange={(e) => update("category", e.target.value)} className={inputClass("category")}>
                  <option value="">Select a category</option>
                  {JOB_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
                {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
              </div>
              <div>
                <label className={labelClass}>Job Type</label>
                <select value={form.job_type} onChange={(e) => update("job_type", e.target.value)} className={inputClass("job_type")}>
                  <option value="full_time">Full-Time</option>
                  <option value="part_time">Part-Time</option>
                  <option value="contract">Contract</option>
                  <option value="gig">Gig</option>
                  <option value="temp">Temporary</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Work Location</label>
                <select value={form.remote_type} onChange={(e) => update("remote_type", e.target.value)} className={inputClass("remote_type")}>
                  <option value="full_remote">Fully Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-Site</option>
                </select>
              </div>
              {form.remote_type !== "full_remote" && (
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>City</label>
                    <input type="text" value={form.location_city} onChange={(e) => update("location_city", e.target.value)} placeholder="San Francisco" className={inputClass("location_city")} />
                    {errors.location_city && <p className="mt-1 text-xs text-red-500">{errors.location_city}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>State</label>
                    <input type="text" value={form.location_state} onChange={(e) => update("location_state", e.target.value)} placeholder="CA" className={inputClass("location_state")} />
                  </div>
                </div>
              )}
              {form.remote_type === "full_remote" && (
                <div>
                  <label className={labelClass}>Timezone Requirements (optional)</label>
                  <input type="text" value={form.timezone_requirements} onChange={(e) => update("timezone_requirements", e.target.value)} placeholder="e.g. Must overlap with EST 9am-1pm" className={inputClass("timezone_requirements")} />
                </div>
              )}
            </div>
          )}

          {/* ── Step 1: Compensation ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Pay Type</label>
                <select value={form.pay_type} onChange={(e) => { update("pay_type", e.target.value); if (e.target.value !== "commission") update("is_100_percent_commission", false); }} className={inputClass("pay_type")}>
                  <option value="salary">Salary</option>
                  <option value="hourly">Hourly</option>
                  <option value="project">Project-Based</option>
                  <option value="commission">Commission</option>
                </select>
              </div>
              {form.pay_type === "commission" && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_100_commission" checked={form.is_100_percent_commission} onChange={(e) => update("is_100_percent_commission", e.target.checked)} className="h-4 w-4 cursor-pointer rounded border-gray-200 text-brand focus:ring-brand/20" />
                  <label htmlFor="is_100_commission" className="cursor-pointer text-sm text-slate-900">This role is 100% commission (no base salary)</label>
                </div>
              )}
              {!(form.pay_type === "commission" && form.is_100_percent_commission) && (
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>{form.pay_type === "hourly" ? "Hourly Rate — Minimum ($)" : "Salary Minimum ($)"}</label>
                    <input type="number" value={form.salary_min} onChange={(e) => update("salary_min", e.target.value)} placeholder={form.pay_type === "hourly" ? "35" : "80000"} min="0" className={inputClass("salary_min")} />
                    {errors.salary_min && <p className="mt-1 text-xs text-red-500">{errors.salary_min}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{form.pay_type === "hourly" ? "Hourly Rate — Maximum ($)" : "Salary Maximum ($)"}</label>
                    <input type="number" value={form.salary_max} onChange={(e) => update("salary_max", e.target.value)} placeholder={form.pay_type === "hourly" ? "55" : "120000"} min="0" className={inputClass("salary_max")} />
                    {errors.salary_max && <p className="mt-1 text-xs text-red-500">{errors.salary_max}</p>}
                  </div>
                </div>
              )}
              {(form.pay_type === "commission" || form.is_100_percent_commission) && (
                <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-600">Commission Details</p>
                  <div>
                    <label className={labelClass}>Commission Percentage (%)</label>
                    <input type="number" value={form.commission_percentage} onChange={(e) => update("commission_percentage", e.target.value)} placeholder="15" min="0" max="100" className={inputClass("commission_percentage")} />
                  </div>
                  <div>
                    <label className={labelClass}>Commission Basis</label>
                    <input type="text" value={form.commission_basis} onChange={(e) => update("commission_basis", e.target.value)} placeholder="e.g. Per closed deal, per lead, recurring" className={inputClass("commission_basis")} />
                  </div>
                  {form.is_100_percent_commission && (
                    <>
                      <div>
                        <label className={labelClass}>Average Annual Earnings ($)</label>
                        <input type="number" value={form.average_earnings} onChange={(e) => update("average_earnings", e.target.value)} placeholder="65000" min="0" className={inputClass("average_earnings")} />
                      </div>
                      <div>
                        <label className={labelClass}>Time to First Payment</label>
                        <input type="text" value={form.time_to_first_payment} onChange={(e) => update("time_to_first_payment", e.target.value)} placeholder="e.g. 30-60 days" className={inputClass("time_to_first_payment")} />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="leads_provided" checked={form.leads_provided} onChange={(e) => update("leads_provided", e.target.checked)} className="h-4 w-4 cursor-pointer rounded border-gray-200 text-brand focus:ring-brand/20" />
                        <label htmlFor="leads_provided" className="cursor-pointer text-sm text-slate-900">Company provides leads</label>
                      </div>
                    </>
                  )}
                  <div>
                    <label className={labelClass}>OTE Minimum ($)</label>
                    <input type="number" value={form.ote_min} onChange={(e) => update("ote_min", e.target.value)} placeholder="80000" min="0" className={inputClass("ote_min")} />
                  </div>
                  <div>
                    <label className={labelClass}>OTE Maximum ($)</label>
                    <input type="number" value={form.ote_max} onChange={(e) => update("ote_max", e.target.value)} placeholder="150000" min="0" className={inputClass("ote_max")} />
                  </div>
                </div>
              )}
              {form.is_100_percent_commission && (
                <div className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  <p className="text-sm text-orange-800">This listing will display a prominent warning to candidates: &quot;This role has no base salary — compensation is entirely commission-based.&quot;</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Requirements ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Respond By Date</label>
                <input type="date" value={form.respond_by_date} onChange={(e) => update("respond_by_date", e.target.value)} className={inputClass("respond_by_date")} />
                <p className="mt-1 text-xs text-slate-600">When candidates should expect to hear back by.</p>
              </div>
              <div>
                <label className={labelClass}>Fill By Date</label>
                <input type="date" value={form.fill_by_date} onChange={(e) => update("fill_by_date", e.target.value)} className={inputClass("fill_by_date")} />
                <p className="mt-1 text-xs text-slate-600">Target date to fill this position. Listing auto-expires after 45 days regardless.</p>
              </div>
              <div>
                <label className={labelClass}>Application Cap</label>
                <input type="number" value={form.max_applications} onChange={(e) => update("max_applications", e.target.value)} min="10" max="200" className={inputClass("max_applications")} />
                <p className="mt-1 text-xs text-slate-600">Maximum number of applications before the listing stops accepting. Range: 10–200.</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="video_app" checked={form.requires_video_application} onChange={(e) => { update("requires_video_application", e.target.checked); if (!e.target.checked) update("video_questions", []); }} className="h-4 w-4 cursor-pointer rounded border-gray-200 text-brand focus:ring-brand/20" />
                <label htmlFor="video_app" className="cursor-pointer text-sm text-slate-900">Require video application from candidates</label>
              </div>
              {form.requires_video_application && (
                <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-600">Video Questions (up to 5)</p>
                  <p className="text-xs text-slate-600">Candidates will record a separate video response for each question.</p>
                  {form.video_questions.map((vq, vi) => (
                    <div key={vi} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">Video Question {vi + 1}</span>
                        <button type="button" onClick={() => removeVideoQuestion(vi)} className="cursor-pointer text-xs font-medium text-red-600 transition-colors duration-200 hover:text-red-700">Remove</button>
                      </div>
                      <input type="text" value={vq.prompt} onChange={(e) => updateVideoQuestion(vi, "prompt", e.target.value)} placeholder="e.g. Tell us about your relevant experience" maxLength={500} className={inputClass("")} />
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className={labelClass}>Time Limit</label>
                          <select value={vq.time_limit_seconds} onChange={(e) => updateVideoQuestion(vi, "time_limit_seconds", Number(e.target.value))} className={inputClass("")}>
                            <option value={30}>30 seconds</option>
                            <option value={60}>60 seconds</option>
                            <option value={90}>90 seconds</option>
                            <option value={120}>120 seconds</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className={labelClass}>Max Retakes</label>
                          <select value={vq.max_retakes} onChange={(e) => updateVideoQuestion(vi, "max_retakes", Number(e.target.value))} className={inputClass("")}>
                            <option value={0}>No retakes</option>
                            <option value={1}>1 retake</option>
                            <option value={2}>2 retakes</option>
                            <option value={3}>3 retakes</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  {form.video_questions.length < 5 && (
                    <button type="button" onClick={addVideoQuestion} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-colors duration-200 hover:bg-gray-50">+ Add Video Question</button>
                  )}
                  {form.video_questions.length === 0 && (
                    <p className="text-xs text-slate-600">No video questions added yet. Add at least one question, or candidates will record a single open-ended introduction.</p>
                  )}
                </div>
              )}
              {form.remote_type === "full_remote" && (
                <div>
                  <label className={labelClass}>Equipment Policy (optional)</label>
                  <input type="text" value={form.equipment_policy} onChange={(e) => update("equipment_policy", e.target.value)} placeholder="e.g. Company provides laptop and monitor" className={inputClass("equipment_policy")} />
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Screening Questions ── */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="text-sm text-slate-600">Add screening questions to filter candidates. These are shown during the application process. Questions requesting SSN, bank info, or other sensitive data are blocked.</p>
              <QuestionTemplateSelector onSelect={loadTemplate} />
              {form.screening_questions.map((q, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Question {i + 1}</span>
                    <button type="button" onClick={() => removeQuestion(i)} className="cursor-pointer text-xs font-medium text-red-600 transition-colors duration-200 hover:text-red-700">Remove</button>
                  </div>
                  <div>
                    <label className={labelClass}>Question</label>
                    <input type="text" value={q.question_text} onChange={(e) => updateQuestion(i, "question_text", e.target.value)} placeholder="e.g. How many years of experience do you have with React?" maxLength={500} className={inputClass(`question_${i}`)} />
                    {errors[`question_${i}`] && <p className="mt-1 text-xs text-red-500">{errors[`question_${i}`]}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Type</label>
                    <select value={q.question_type} onChange={(e) => updateQuestion(i, "question_type", e.target.value)} className={inputClass("")}>
                      <option value="short_answer">Short Answer</option>
                      <option value="yes_no">Yes / No</option>
                      <option value="numerical">Numerical</option>
                      <option value="multiple_choice">Multiple Choice</option>
                    </select>
                  </div>
                  {q.question_type === "multiple_choice" && (
                    <div className="space-y-2">
                      <label className={labelClass}>Options</label>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input type="text" value={opt} onChange={(e) => { const opts = [...q.options]; opts[oi] = e.target.value; updateQuestion(i, "options", opts); }} placeholder={`Option ${oi + 1}`} className={inputClass(`question_${i}_options`)} />
                          {q.options.length > 2 && (<button type="button" onClick={() => { const opts = q.options.filter((_, idx) => idx !== oi); updateQuestion(i, "options", opts); }} className="cursor-pointer text-xs text-red-600 transition-colors duration-200 hover:text-red-700">Remove</button>)}
                        </div>
                      ))}
                      {q.options.length < 6 && (<button type="button" onClick={() => updateQuestion(i, "options", [...q.options, ""])} className="cursor-pointer text-xs font-medium text-brand transition-colors duration-200 hover:text-brand-hover">+ Add option</button>)}
                      {errors[`question_${i}_options`] && <p className="text-xs text-red-500">{errors[`question_${i}_options`]}</p>}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(i, "required", e.target.checked)} className="h-4 w-4 cursor-pointer rounded border-gray-200 text-brand focus:ring-brand/20" />
                      <span className="text-xs text-slate-600">Required</span>
                    </div>
                    {(q.question_type === "yes_no" || q.question_type === "multiple_choice") && (
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={q.is_knockout} onChange={(e) => updateQuestion(i, "is_knockout", e.target.checked)} className="h-4 w-4 cursor-pointer rounded border-gray-200 text-brand focus:ring-brand/20" />
                        <span className="text-xs text-slate-600">Knockout</span>
                      </div>
                    )}
                  </div>
                  {q.is_knockout && (q.question_type === "yes_no" || q.question_type === "multiple_choice") && (
                    <div>
                      <label className={labelClass}>Auto-reject if answer is:</label>
                      {q.question_type === "yes_no" ? (
                        <select value={q.knockout_answer} onChange={(e) => updateQuestion(i, "knockout_answer", e.target.value)} className={inputClass("")}>
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      ) : (
                        <select value={q.knockout_answer} onChange={(e) => updateQuestion(i, "knockout_answer", e.target.value)} className={inputClass("")}>
                          <option value="">Select an option</option>
                          {q.options.filter(Boolean).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                  <div className="flex gap-3">
                    {(q.question_type === "yes_no" || q.question_type === "numerical" || q.question_type === "multiple_choice") && (
                      <div className="w-32">
                        <label className={labelClass}>Points</label>
                        <input type="number" value={q.point_value} onChange={(e) => updateQuestion(i, "point_value", Number(e.target.value) || 0)} min="0" max="100" placeholder="0" className={inputClass("")} />
                      </div>
                    )}
                    {q.question_type === "short_answer" && (
                      <div className="w-40">
                        <label className={labelClass}>Min Characters</label>
                        <input type="number" value={q.min_length} onChange={(e) => updateQuestion(i, "min_length", e.target.value)} min="10" max="5000" placeholder="None" className={inputClass("")} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {form.screening_questions.length < 10 && (
                <button type="button" onClick={addQuestion} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-colors duration-200 hover:bg-gray-50">+ Add Screening Question</button>
              )}
              {form.screening_questions.length === 0 && (
                <p className="text-xs text-slate-600">No screening questions added. Candidates will apply with their profile only. You can skip this step.</p>
              )}
            </div>
          )}

          {/* ── Step 4: Review ── */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-slate-900">Review Your Listing</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-slate-600">Title</span><span className="font-medium text-slate-900">{form.title}</span></div>
                <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-slate-600">Category</span><span className="font-medium text-slate-900">{form.category}</span></div>
                <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-slate-600">Job Type</span><span className="font-medium text-slate-900">{form.job_type.replace("_", " ")}</span></div>
                <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-slate-600">Work Location</span><span className="font-medium text-slate-900">{form.remote_type.replace("_", " ")}{form.remote_type !== "full_remote" && form.location_city ? ` — ${form.location_city}, ${form.location_state}` : ""}</span></div>
                <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-slate-600">Pay Type</span><span className="font-medium text-slate-900">{form.pay_type}{form.is_100_percent_commission ? " (100% commission)" : ""}</span></div>
                {!form.is_100_percent_commission && (form.salary_min || form.salary_max) && (
                  <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-slate-600">Salary Range</span><span className="font-medium tabular-nums text-slate-900">${Number(form.salary_min || 0).toLocaleString()} – ${Number(form.salary_max || 0).toLocaleString()}</span></div>
                )}
                {(form.ote_min || form.ote_max) && (
                  <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-slate-600">OTE</span><span className="font-medium tabular-nums text-slate-900">${Number(form.ote_min || 0).toLocaleString()} – ${Number(form.ote_max || 0).toLocaleString()}</span></div>
                )}
                <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-slate-600">Application Cap</span><span className="font-medium tabular-nums text-slate-900">{form.max_applications}</span></div>
                <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-slate-600">Video Required</span><span className="font-medium text-slate-900">{form.requires_video_application ? "Yes" : "No"}</span></div>
                <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-slate-600">Screening Questions</span><span className="font-medium text-slate-900">{form.screening_questions.length}{form.screening_questions.some((q) => q.is_knockout) ? ` (${form.screening_questions.filter((q) => q.is_knockout).length} knockout)` : ""}</span></div>
                {form.screening_questions.some((q) => q.point_value > 0) && (
                  <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-slate-600">Max Screening Score</span><span className="font-medium tabular-nums text-slate-900">{form.screening_questions.reduce((sum, q) => sum + (Number(q.point_value) || 0), 0)} pts</span></div>
                )}
                {form.requires_video_application && (
                  <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-slate-600">Video Questions</span><span className="font-medium text-slate-900">{form.video_questions.length || "Open intro"}</span></div>
                )}
                <div className="flex justify-between"><span className="text-slate-600">Auto-Expires</span><span className="font-medium text-slate-900">45 days after posting</span></div>
              </div>

              {form.is_100_percent_commission && (
                <div className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  <p className="text-sm text-orange-800">This listing will display a commission-only warning to candidates.</p>
                </div>
              )}

              {submitError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Navigation Buttons ── */}
      <div className="mt-6 flex items-center justify-between">
        {step > 0 ? (
          <button type="button" onClick={goBack} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition-colors duration-200 hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button type="button" onClick={goNext} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover">
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={submitting} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? "Publishing..." : "Publish Listing"}
          </button>
        )}
      </div>
    </div>
  );
}
