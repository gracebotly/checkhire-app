"use client";

import { Shield, User, Video, MessageSquare, Briefcase } from "lucide-react";
import Link from "next/link";
import type { CandidateView } from "@/types/database";

interface KanbanCardProps {
  candidate: CandidateView;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  selectionMode?: boolean;
}

export function KanbanCard({ candidate, selected, onSelect, selectionMode }: KanbanCardProps) {
  const displayName =
    candidate.disclosure_level >= 3 && candidate.full_name
      ? candidate.full_name
      : candidate.disclosure_level >= 2 && candidate.first_name
        ? candidate.first_name
        : candidate.pseudonym;

  const showPseudonym = candidate.disclosure_level === 1;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/checkhire-app-id", candidate.application_id);
        e.dataTransfer.setData("application/checkhire-status", candidate.status);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`select-none rounded-lg border bg-white p-3 transition-colors duration-200 hover:border-gray-300 ${
        selected ? "border-brand ring-2 ring-brand/20" : "border-gray-200"
      }`}
      style={{ cursor: "grab", WebkitUserSelect: "none", userSelect: "none" }}
    >
      {/* Selection checkbox + Identity */}
      <div className="flex items-start gap-2">
        {selectionMode && onSelect && (
          <input
            type="checkbox"
            checked={selected || false}
            onChange={(e) => onSelect(candidate.application_id, e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 cursor-pointer rounded border-gray-200 text-brand focus:ring-brand/20"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="min-w-0 flex-1">
          {showPseudonym ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-muted px-2 py-0.5 text-xs font-bold text-brand">
              <Shield className="h-3 w-3" />
              {candidate.pseudonym}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-muted px-2 py-0.5 text-xs font-bold text-brand">
              <User className="h-3 w-3" />
              {displayName}
            </span>
          )}
        </div>
      </div>

      {/* Metadata row */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {candidate.screening_score != null && candidate.screening_score > 0 && (
          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-700 border border-emerald-200">
            {candidate.screening_score}pts
          </span>
        )}
        {candidate.video_responses && candidate.video_responses.length > 0 && (
          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
            <Video className="inline h-2.5 w-2.5" />
          </span>
        )}
        {candidate.years_experience != null && (
          <span className="flex items-center gap-0.5 text-[10px] text-slate-600">
            <Briefcase className="h-2.5 w-2.5" />
            {candidate.years_experience}yr
          </span>
        )}
      </div>

      {/* Top skills */}
      {candidate.skills.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {candidate.skills.slice(0, 3).map((s) => (
            <span key={s} className="rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] text-slate-600">
              {s}
            </span>
          ))}
          {candidate.skills.length > 3 && (
            <span className="text-[10px] text-slate-600">+{candidate.skills.length - 3}</span>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-2 flex justify-end">
        <Link
          href={`/employer/messages/${candidate.application_id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50"
        >
          <MessageSquare className="h-2.5 w-2.5" />
          Chat
        </Link>
      </div>
    </div>
  );
}
