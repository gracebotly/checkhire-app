"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Link2, Plus, Trash2, Video, X } from "lucide-react";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

interface InterviewScheduleFormProps {
  applicationId: string;
  candidateName: string; // pseudonym or first name
  onScheduled?: () => void;
}

/**
 * Modal form for employers to propose interview time slots.
 * Up to 5 time slots, a video call link, and optional notes.
 */
export function InterviewScheduleForm({
  applicationId,
  candidateName,
  onScheduled,
}: InterviewScheduleFormProps) {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState([{ datetime: "", duration_minutes: 30 }]);
  const [videoLink, setVideoLink] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSlot = () => {
    if (slots.length >= 5) return;
    setSlots((prev) => [...prev, { datetime: "", duration_minutes: 30 }]);
  };

  const removeSlot = (index: number) => {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: string, value: string | number) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
  };

  const handleSubmit = async () => {
    setError(null);

    const validSlots = slots.filter((s) => s.datetime);
    if (validSlots.length === 0) {
      setError("Add at least one time slot.");
      return;
    }

    // Convert datetime-local to ISO
    const proposedSlots = validSlots.map((s) => ({
      datetime: new Date(s.datetime).toISOString(),
      duration_minutes: s.duration_minutes,
    }));

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/employer/applications/${applicationId}/schedule-interview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposed_slots: proposedSlots,
            video_call_link: videoLink || null,
            notes: notes || null,
            timezone_employer: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        }
      );
      const data = await res.json();

      if (data.ok) {
        setOpen(false);
        setSlots([{ datetime: "", duration_minutes: 30 }]);
        setVideoLink("");
        setNotes("");
        onScheduled?.();
      } else {
        setError(data.message || "Failed to schedule interview.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="default" size="sm">
          <Video className="mr-1.5 h-3 w-3" />
          Schedule Interview
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold text-slate-900">
              Schedule Interview
            </Dialog.Title>
            <Dialog.Close className="cursor-pointer rounded-md p-1 text-slate-600 transition-colors duration-200 hover:text-slate-900">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Propose time slots for {candidateName}. They&apos;ll pick their preferred time.
          </p>

          <div className="mt-5 space-y-4">
            {/* Time Slots */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                <Calendar className="h-3 w-3" />
                Time Slots
              </label>
              <div className="space-y-2">
                {slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="datetime-local"
                      value={slot.datetime}
                      onChange={(e) => updateSlot(i, "datetime", e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-600" />
                      <select
                        value={slot.duration_minutes}
                        onChange={(e) =>
                          updateSlot(i, "duration_minutes", parseInt(e.target.value))
                        }
                        className="h-10 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-sm text-slate-900 transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
                      >
                        <option value={15}>15m</option>
                        <option value={30}>30m</option>
                        <option value={45}>45m</option>
                        <option value={60}>1h</option>
                        <option value={90}>1.5h</option>
                      </select>
                    </div>
                    {slots.length > 1 && (
                      <button
                        onClick={() => removeSlot(i)}
                        className="cursor-pointer rounded-md p-1.5 text-slate-600 transition-colors duration-200 hover:text-red-600"
                        aria-label="Remove slot"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {slots.length < 5 && (
                <button
                  onClick={addSlot}
                  className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
                >
                  <Plus className="h-3 w-3" />
                  Add time slot
                </button>
              )}
            </div>

            {/* Video Link */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                <Link2 className="h-3 w-3" />
                Video Call Link
              </label>
              <Input
                type="url"
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
                placeholder="https://zoom.us/j/... or meet.google.com/..."
              />
              <p className="mt-1 text-xs text-slate-600">
                Zoom, Google Meet, Teams, or any video link
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 text-xs font-semibold text-slate-900">
                Notes for Candidate (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What to prepare, who they'll be meeting, dress code..."
                rows={2}
                maxLength={1000}
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </Dialog.Close>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Send to Candidate"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
