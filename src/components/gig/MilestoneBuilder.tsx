"use client";

import { Plus, X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type MilestoneFormItem = {
  title: string;
  description: string;
  amount: string; // dollars as string for input
};

type Props = {
  milestones: MilestoneFormItem[];
  setMilestones: (milestones: MilestoneFormItem[]) => void;
  totalAmount: number; // dollars
};

export function MilestoneBuilder({
  milestones,
  setMilestones,
  totalAmount,
}: Props) {
  const addMilestone = () => {
    setMilestones([
      ...milestones,
      { title: "", description: "", amount: "" },
    ]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length <= 2) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (
    index: number,
    field: keyof MilestoneFormItem,
    value: string
  ) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...milestones];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setMilestones(updated);
  };

  const moveDown = (index: number) => {
    if (index === milestones.length - 1) return;
    const updated = [...milestones];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setMilestones(updated);
  };

  const runningTotal = milestones.reduce(
    (sum, m) => sum + (parseFloat(m.amount) || 0),
    0
  );
  const matches = Math.abs(runningTotal - totalAmount) < 0.01;

  return (
    <div className="space-y-3">
      {milestones.map((m, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Milestone {i + 1}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveUp(i)}
                disabled={i === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveDown(i)}
                disabled={i === milestones.length - 1}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => removeMilestone(i)}
                disabled={milestones.length <= 2}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Input
            placeholder="Milestone title"
            value={m.title}
            onChange={(e) => updateMilestone(i, "title", e.target.value)}
            maxLength={100}
          />
          <Input
            placeholder="Description (optional)"
            value={m.description}
            onChange={(e) =>
              updateMilestone(i, "description", e.target.value)
            }
            maxLength={500}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">$</span>
            <Input
              type="number"
              placeholder="Amount"
              value={m.amount}
              onChange={(e) => updateMilestone(i, "amount", e.target.value)}
              min={1}
              step="0.01"
              className="w-32"
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addMilestone}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Add Milestone
      </Button>

      <div
        className={`text-sm font-semibold font-mono tabular-nums ${
          matches ? "text-green-700" : "text-red-600"
        }`}
      >
        Total: ${runningTotal.toFixed(2)} of ${totalAmount.toFixed(2)}
      </div>
    </div>
  );
}
