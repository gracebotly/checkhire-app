"use client";

import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

interface SkillsInputProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  maxSkills?: number;
}

export function SkillsInput({
  skills,
  onChange,
  maxSkills = 50,
}: SkillsInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addSkill = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (skills.length >= maxSkills) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...skills, trimmed]);
    setInputValue("");
  };

  const removeSkill = (index: number) => {
    onChange(skills.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && skills.length > 0) {
      removeSkill(skills.length - 1);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-ring/40">
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill, i) => (
          <span
            key={`${skill}-${i}`}
            className="inline-flex items-center gap-1 rounded-md bg-brand-muted px-2 py-0.5 text-xs font-medium text-brand"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(i)}
              className="cursor-pointer rounded-sm p-0.5 transition-colors duration-200 hover:bg-brand/10"
              aria-label={`Remove ${skill}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            skills.length === 0 ? "Type a skill and press Enter..." : "Add more..."
          }
          className="min-w-[120px] flex-1 border-none bg-transparent py-0.5 text-sm text-slate-900 outline-none placeholder:text-slate-600"
        />
      </div>
      {skills.length >= maxSkills && (
        <p className="mt-1 text-xs text-slate-600">
          Maximum {maxSkills} skills reached.
        </p>
      )}
    </div>
  );
}
