"use client";

import type { ScreeningQuestion } from "@/types/database";

interface ScreeningQuizProps {
  questions: ScreeningQuestion[];
  responses: Record<string, unknown>;
  onChange: (responses: Record<string, unknown>) => void;
}

export function ScreeningQuiz({
  questions,
  responses,
  onChange,
}: ScreeningQuizProps) {
  const updateResponse = (questionId: string, value: unknown) => {
    onChange({ ...responses, [questionId]: value });
  };

  return (
    <div className="space-y-4">
      {questions.map((q, index) => (
        <div key={q.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <label className="block text-sm font-medium text-slate-900">
            {index + 1}. {q.question_text}
            {q.required && <span className="ml-1 text-red-500">*</span>}
          </label>

          <div className="mt-2">
            {q.question_type === "short_answer" && (
              <div>
                <textarea
                  value={(responses[q.id] as string) || ""}
                  onChange={(e) => updateResponse(q.id, e.target.value)}
                  placeholder="Type your answer..."
                  rows={3}
                  maxLength={5000}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                {q.min_length && q.min_length > 0 && (
                  <div className="mt-1 flex justify-between">
                    <span className={`text-xs ${((responses[q.id] as string) || "").length < q.min_length ? "text-amber-600" : "text-emerald-600"}`}>
                      {((responses[q.id] as string) || "").length < q.min_length
                        ? `Minimum ${q.min_length} characters (currently ${((responses[q.id] as string) || "").length})`
                        : `${((responses[q.id] as string) || "").length} characters`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {q.question_type === "yes_no" && (
              <div className="flex gap-3">
                {["Yes", "No"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateResponse(q.id, opt)}
                    className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                      responses[q.id] === opt
                        ? "border-brand bg-brand-muted text-brand"
                        : "border-gray-200 bg-white text-slate-600 hover:border-gray-300"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.question_type === "numerical" && (
              <input
                type="number"
                value={(responses[q.id] as string) || ""}
                onChange={(e) => updateResponse(q.id, e.target.value)}
                placeholder="Enter a number..."
                className="w-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            )}

            {q.question_type === "multiple_choice" && q.options && (
              <div className="space-y-2">
                {(q.options as string[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateResponse(q.id, opt)}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-left text-sm transition-colors duration-200 ${
                      responses[q.id] === opt
                        ? "border-brand bg-brand-muted font-medium text-brand"
                        : "border-gray-200 bg-white text-slate-600 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        responses[q.id] === opt
                          ? "border-brand bg-brand"
                          : "border-gray-300"
                      }`}
                    >
                      {responses[q.id] === opt && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
