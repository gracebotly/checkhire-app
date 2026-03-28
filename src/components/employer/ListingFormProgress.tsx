"use client";

import { Check } from "lucide-react";

const STEPS = [
  { key: "details", label: "Job Details" },
  { key: "compensation", label: "Compensation" },
  { key: "requirements", label: "Requirements" },
  { key: "screening", label: "Screening" },
  { key: "review", label: "Review" },
];

interface ListingFormProgressProps {
  currentStep: number;
}

export function ListingFormProgress({ currentStep }: ListingFormProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={step.key} className="flex flex-1 items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200 ${
                    isCompleted
                      ? "bg-brand text-white"
                      : isCurrent
                        ? "border-2 border-brand bg-white text-brand"
                        : "border-2 border-gray-200 bg-white text-slate-600"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium ${
                    isCurrent ? "text-brand" : isCompleted ? "text-slate-900" : "text-slate-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line (not after last step) */}
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 transition-colors duration-200 ${
                    isCompleted ? "bg-brand" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-slate-600">
        Step {currentStep + 1} of {STEPS.length} — {STEPS[currentStep].label}
      </p>
    </div>
  );
}
