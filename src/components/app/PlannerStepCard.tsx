"use client";

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
}

// ---------------------------------------------------------------------------
// PlannerStepCard — a single step row in the day planner
// Slice 1: completion toggle, reorder, remove. Timer & editing come in Task 15.
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
}: PlannerStepCardProps) {
  const { taskStep } = step;
  const completed = taskStep.completed;
  const project = taskStep.task.project;

  // Prefer user-edited text over the original AI-generated text
  const displayText = taskStep.userEditedText || taskStep.text;

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
          onComplete(taskStep.task.id, taskStep.id, !completed)
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
          {/* Step text — line-through when completed */}
          <p
            className={`text-sm text-[#F8FAFC] leading-snug truncate ${
              completed ? "line-through text-[#94A3B8]" : ""
            }`}
          >
            {displayText}
          </p>

          {/* Duration estimate badge (e.g. "5 min") */}
          {taskStep.durationEstimate && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] text-[#64748B] bg-[#334155] px-1.5 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              {taskStep.durationEstimate}
            </span>
          )}
        </div>

        {/* Project name — small text below the step */}
        {project && (
          <p className="text-xs text-[#64748B] truncate mt-0.5">
            {project.emoji} {project.name}
          </p>
        )}
      </div>

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
