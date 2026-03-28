"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import type { QuestionTemplate, QuestionTemplateCategory } from "@/types/database";

const CATEGORY_LABELS: Record<QuestionTemplateCategory, string> = {
  remote_readiness: "Remote Readiness",
  sales: "Sales Screening",
  technical: "Technical Skills",
  customer_service: "Customer Service",
  general: "General",
};

interface QuestionTemplateSelectorProps {
  onSelect: (questions: QuestionTemplate["questions"]) => void;
}

export function QuestionTemplateSelector({ onSelect }: QuestionTemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<QuestionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (open && templates.length === 0) {
      setLoading(true);
      fetch("/api/employer/question-templates")
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) setTemplates(data.templates || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, templates.length]);

  const handleSelect = (template: QuestionTemplate) => {
    onSelect(template.questions);
    setOpen(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-brand/30 bg-brand-muted px-4 py-2 text-sm font-medium text-brand transition-colors duration-200 hover:bg-brand/10"
      >
        <BookOpen className="h-4 w-4" />
        Load from template
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-3 rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">Question Templates</h4>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors duration-200 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
              </div>
            ) : templates.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-600">No templates available.</p>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors duration-200 hover:bg-gray-100"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{t.name}</p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {CATEGORY_LABELS[t.category] || t.category} · {t.questions.length} question{t.questions.length !== 1 ? "s" : ""}
                          {t.is_platform_default && (
                            <span className="ml-2 inline-flex rounded-md bg-brand-muted px-1.5 py-0.5 text-xs font-medium text-brand">
                              Default
                            </span>
                          )}
                        </p>
                      </div>
                      {expandedId === t.id ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-slate-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-600" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedId === t.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 border-t border-gray-200 px-4 py-3">
                            {t.questions.map((q, qi) => (
                              <div key={qi} className="text-xs">
                                <p className="font-medium text-slate-900">
                                  {qi + 1}. {q.question_text}
                                </p>
                                <p className="mt-0.5 text-slate-600">
                                  {q.question_type.replace("_", " ")}
                                  {q.is_knockout && " · Knockout"}
                                  {q.point_value > 0 && ` · ${q.point_value} pts`}
                                  {q.min_length && ` · Min ${q.min_length} chars`}
                                </p>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleSelect(t)}
                              className="mt-2 w-full cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover"
                            >
                              Use this template
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
