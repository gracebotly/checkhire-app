"use client";

import { cn } from "@/lib/utils";

type Props = {
  totalAmountCents: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

const PRESETS = [
  { label: "Full Refund", value: 0 },
  { label: "25%", value: 25 },
  { label: "50%", value: 50 },
  { label: "75%", value: 75 },
  { label: "Full Release", value: 100 },
];

export function ProposalSlider({
  totalAmountCents,
  value,
  onChange,
  disabled = false,
}: Props) {
  const clientAmount = ((totalAmountCents * (100 - value)) / 100 / 100).toFixed(2);
  const freelancerAmount = ((totalAmountCents * value) / 100 / 100).toFixed(2);

  return (
    <div className="space-y-4">
      <p className="text-center text-2xl font-bold font-mono tabular-nums text-slate-900">
        {value}% to freelancer
      </p>

      <div>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 accent-brand disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow"
        />
        <div className="flex justify-between mt-1">
          <div>
            <p className="text-xs font-semibold text-slate-600">Client</p>
            <p className="font-mono tabular-nums text-sm font-semibold text-slate-900">
              ${clientAmount}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-600">Freelancer</p>
            <p className="font-mono tabular-nums text-sm font-semibold text-slate-900">
              ${freelancerAmount}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            disabled={disabled}
            className={cn(
              "rounded-full border px-3 py-1 text-xs cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
              value === preset.value
                ? "bg-brand text-white border-brand"
                : "border-gray-200 text-slate-600 hover:border-gray-300"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
