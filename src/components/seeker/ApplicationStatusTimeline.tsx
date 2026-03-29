"use client";

import { Check, Circle, Clock } from "lucide-react";

interface TimelineEvent {
  label: string;
  timestamp: string | null;
  active: boolean;
  completed: boolean;
}

interface ApplicationStatusTimelineProps {
  status: string;
  createdAt: string;
  disclosedAtStage2: string | null;
  disclosedAtStage3: string | null;
}

const STATUS_ORDER = [
  "applied",
  "reviewed",
  "shortlisted",
  "interview_requested",
  "interview_accepted",
  "offered",
  "hired",
];

export function ApplicationStatusTimeline({
  status,
  createdAt,
  disclosedAtStage2,
  disclosedAtStage3,
}: ApplicationStatusTimelineProps) {
  const isTerminal = status === "rejected" || status === "withdrawn";
  const currentIndex = STATUS_ORDER.indexOf(status);

  const events: TimelineEvent[] = [];

  // Always show "Applied"
  events.push({
    label: "Applied",
    timestamp: createdAt,
    active: status === "applied",
    completed: currentIndex > 0 || isTerminal,
  });

  if (currentIndex >= 1 || isTerminal) {
    events.push({
      label: "Application Reviewed",
      timestamp: null,
      active: status === "reviewed",
      completed: currentIndex > 1 || isTerminal,
    });
  }

  if (currentIndex >= 2) {
    events.push({
      label: "Shortlisted",
      timestamp: null,
      active: status === "shortlisted",
      completed: currentIndex > 2,
    });
  }

  if (currentIndex >= 3 || status === "interview_requested") {
    events.push({
      label: "Interview Requested",
      timestamp: null,
      active: status === "interview_requested",
      completed: currentIndex > 3,
    });
  }

  if (currentIndex >= 4) {
    events.push({
      label: "Interview Accepted",
      timestamp: disclosedAtStage2,
      active: status === "interview_accepted",
      completed: currentIndex > 4,
    });
  }

  if (currentIndex >= 5) {
    events.push({
      label: "Offer Extended",
      timestamp: null,
      active: status === "offered",
      completed: currentIndex > 5,
    });
  }

  if (status === "hired") {
    events.push({
      label: "Hired",
      timestamp: disclosedAtStage3,
      active: true,
      completed: true,
    });
  }

  if (status === "rejected") {
    events.push({
      label: "Not Selected",
      timestamp: null,
      active: true,
      completed: false,
    });
  }

  if (status === "withdrawn") {
    events.push({
      label: "Withdrawn by You",
      timestamp: null,
      active: true,
      completed: false,
    });
  }

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">Status Timeline</h3>
      <div className="space-y-0">
        {events.map((event, i) => {
          const isLast = i === events.length - 1;
          const isNegative = event.label === "Not Selected" || event.label === "Withdrawn by You";

          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    event.completed
                      ? "bg-emerald-100"
                      : event.active
                        ? isNegative
                          ? "bg-gray-100"
                          : "bg-brand-muted"
                        : "bg-gray-100"
                  }`}
                >
                  {event.completed ? (
                    <Check className="h-3 w-3 text-emerald-600" />
                  ) : event.active ? (
                    isNegative ? (
                      <Circle className="h-3 w-3 text-slate-600" />
                    ) : (
                      <Clock className="h-3 w-3 text-brand" />
                    )
                  ) : (
                    <Circle className="h-2.5 w-2.5 text-gray-300" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`w-px flex-1 ${
                      event.completed ? "bg-emerald-200" : "bg-gray-200"
                    }`}
                    style={{ minHeight: "20px" }}
                  />
                )}
              </div>

              <div className={`${isLast ? "pb-0" : "pb-4"}`}>
                <p
                  className={`text-sm font-medium ${
                    event.active
                      ? isNegative
                        ? "text-slate-600"
                        : "text-brand"
                      : event.completed
                        ? "text-slate-900"
                        : "text-slate-600"
                  }`}
                >
                  {event.label}
                </p>
                {event.timestamp && (
                  <p className="text-xs text-slate-600">{formatDate(event.timestamp)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
