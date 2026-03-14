"use client";

import { useState, useRef } from "react";
import type { Translations } from "@/lib/i18n";
import type { DayPlanStepWithDetails } from "@/types";
import {
  Circle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  X,
  Clock,
} from "lucide-react";
import MiniTimer from "./MiniTimer";
import { HintTooltip } from "@/components/ui/hint-tooltip";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface PlannerStepCardProps {
  t: Translations;
  step: DayPlanStepWithDetails;
  isFirst: boolean; // Disable "move up" when first
  isLast: boolean; // Disable "move down" when last
  onComplete: (taskId: string, stepId: string, completed: boolean) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove: (id: string) => void;
  onTimerStart: (id: string) => void;    // Start timer on this DayPlanStep
  onTimerPause: (id: string) => void;    // Pause timer on this DayPlanStep
  onEditStep: (taskId: string, stepId: string, text: string | null) => void; // Save edited text (null = reset)
}

// ---------------------------------------------------------------------------
// PlannerStepCard — a single step row in the day planner
// Supports: completion toggle, reorder, remove, inline editing, MiniTimer.
// ---------------------------------------------------------------------------
export default function PlannerStepCard({
  t,
  step,
  isFirst,
  isLast,
  onComplete,
  onMoveUp,
  onMoveDown,
  onRemove,
  onTimerStart,
  onTimerPause,
  onEditStep,
}: PlannerStepCardProps) {
  const { taskStep: ts } = step;
  const completed = ts.completed;
  const project = ts.task.project;

  // Prefer user-edited text over the original AI-generated text
  const displayText = ts.userEditedText || ts.text;

  // -- Inline editing state --------------------------------------------------
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(displayText);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Save edited text on blur or Enter key */
  function handleEditSave() {
    setEditing(false);
    const trimmed = editText.trim();
    if (trimmed && trimmed !== ts.text) {
      onEditStep(ts.task.id, ts.id, trimmed);
    } else if (trimmed === ts.text) {
      // Reset to original AI text (clear user edit)
      onEditStep(ts.task.id, ts.id, null);
    }
  }

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#1E293B] border border-[#334155] transition-opacity ${
        completed ? "opacity-60" : ""
      }`}
    >
      {/* ---- Project color dot (shows which project this step belongs to) ---- */}
      {project && (
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: project.color }}
          title={`${project.emoji} ${project.name}`}
        />
      )}

      {/* ---- Completion checkbox — circle toggles to green check ---- */}
      <button
        type="button"
        onClick={() =>
          onComplete(ts.task.id, ts.id, !completed)
        }
        className="flex-shrink-0 transition-colors"
        aria-label={completed ? "Mark incomplete" : "Mark complete"}
      >
        {completed ? (
          <CheckCircle2 className="w-5 h-5 text-[#86EFAC]" />
        ) : (
          <Circle className="w-5 h-5 text-[#94A3B8] hover:text-[#F8FAFC]" />
        )}
      </button>

      {/* ---- Step text + metadata (duration badge, project name) ---- */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {/* Step text — editable when not completed */}
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleEditSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEditSave();
                if (e.key === "Escape") {
                  setEditText(displayText);
                  setEditing(false);
                }
              }}
              autoFocus
              className="flex-1 text-sm text-[#F8FAFC] bg-[#0F172A] border border-[#86EFAC]/50 rounded px-2 py-0.5 outline-none"
            />
          ) : (
            <p
              className={`text-sm text-[#F8FAFC] leading-snug truncate ${
                completed ? "line-through text-[#94A3B8]" : "cursor-text"
              }`}
              onClick={() => {
                if (!completed) {
                  setEditText(displayText);
                  setEditing(true);
                }
              }}
            >
              {displayText}
            </p>
          )}

          {/* Duration estimate badge (e.g. "5 min") */}
          {ts.durationEstimate && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] text-[#64748B] bg-[#334155] px-1.5 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              {ts.durationEstimate}
              <HintTooltip text={t.hints.timeEstimate} />
            </span>
          )}
        </div>

        {/* Project name + "Reset to original" link when user has edited */}
        <div className="flex items-center gap-2 mt-0.5">
          {project && (
            <p className="text-xs text-[#64748B] truncate">
              {project.emoji} {project.name}
            </p>
          )}
          {ts.userEditedText && !completed && (
            <button
              type="button"
              onClick={() => onEditStep(ts.task.id, ts.id, null)}
              className="text-[10px] text-[#64748B] hover:text-[#86EFAC] underline transition-colors"
            >
              {t.planner.resetToOriginal}
            </button>
          )}
        </div>
      </div>

      {/* ---- MiniTimer — only shown for incomplete steps ---- */}
      {!completed && (
        <MiniTimer
          timeSpentSeconds={step.timeSpentSeconds}
          timerStartedAt={step.timerStartedAt}
          onStart={() => onTimerStart(step.id)}
          onPause={() => onTimerPause(step.id)}
        />
      )}

      {/* ---- Right actions: reorder + remove (hidden when completed) ---- */}
      {!completed && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Move up */}
          <button
            type="button"
            onClick={() => onMoveUp(step.id)}
            disabled={isFirst}
            className="p-1 rounded text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={t.planner.moveUp}
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          {/* Move down */}
          <button
            type="button"
            onClick={() => onMoveDown(step.id)}
            disabled={isLast}
            className="p-1 rounded text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={t.planner.moveDown}
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Remove from plan */}
          <button
            type="button"
            onClick={() => onRemove(step.id)}
            className="p-1 rounded text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50 transition-colors"
            title={t.planner.removeFromPlan}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
