"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Loader2, Send } from "lucide-react";
import type { RejectionTemplate } from "@/types/database";

interface RejectionTemplateModalProps {
  selectedCount: number;
  onConfirm: (message: string) => void;
  onClose: () => void;
}

export function RejectionTemplateModal({
  selectedCount,
  onConfirm,
  onClose,
}: RejectionTemplateModalProps) {
  const [templates, setTemplates] = useState<RejectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    fetch("/api/employer/rejection-templates")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setTemplates(data.templates || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedText = useCustom
    ? customMessage
    : templates.find((t) => t.id === selectedTemplate)?.message_text || "";

  const handleConfirm = () => {
    if (selectedText.trim()) {
      onConfirm(selectedText.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Reject {selectedCount} candidate{selectedCount !== 1 ? "s" : ""}
          </h2>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors duration-200 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <p className="mb-4 text-sm text-slate-600">
            Choose a message to send to each rejected candidate through in-app chat.
          </p>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setSelectedTemplate(t.id); setUseCustom(false); }}
                  className={`w-full cursor-pointer rounded-lg border px-4 py-3 text-left transition-colors duration-200 ${
                    selectedTemplate === t.id && !useCustom
                      ? "border-brand bg-brand-muted"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <p className="text-xs font-medium text-slate-900">{t.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{t.message_text}</p>
                </button>
              ))}

              {/* Custom message option */}
              <button
                type="button"
                onClick={() => { setUseCustom(true); setSelectedTemplate(null); }}
                className={`w-full cursor-pointer rounded-lg border px-4 py-3 text-left transition-colors duration-200 ${
                  useCustom
                    ? "border-brand bg-brand-muted"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <p className="text-xs font-medium text-slate-900">Write a custom message</p>
              </button>

              {useCustom && (
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type your rejection message..."
                  rows={4}
                  maxLength={1000}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedText.trim()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Send & Reject
          </button>
        </div>
      </motion.div>
    </div>
  );
}
