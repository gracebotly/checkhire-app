"use client";

import { LayoutGrid, List } from "lucide-react";

interface PipelineViewToggleProps {
  view: "kanban" | "list";
  onViewChange: (view: "kanban" | "list") => void;
}

export function PipelineViewToggle({ view, onViewChange }: PipelineViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
      <button
        type="button"
        onClick={() => onViewChange("kanban")}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
          view === "kanban"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-gray-50"
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Kanban
      </button>
      <button
        type="button"
        onClick={() => onViewChange("list")}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
          view === "list"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-gray-50"
        }`}
      >
        <List className="h-3.5 w-3.5" />
        List
      </button>
    </div>
  );
}
