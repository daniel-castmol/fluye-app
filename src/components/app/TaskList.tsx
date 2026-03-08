"use client";

import { useState } from "react";
import type { Task } from "@/types";
import type { Translations } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, X, ChevronDown, ChevronUp, RefreshCw, Share2, Check } from "lucide-react";
import { toast } from "sonner";

interface TaskListProps {
  t: Translations;
  tasks: Task[];
  onStepToggle: (taskId: string, stepId: string, completed: boolean) => void;
  onStepRegenerate: (taskId: string, stepId: string) => Promise<void>;
  onTaskDelete: (taskId: string) => void;
  onClearAll: () => void;
  onAddMore: () => void;
}

/** Per-task "Why these steps?" expandable section */
function TaskContextExplainer({
  t,
  clarification,
  roleWork,
}: {
  t: Translations;
  clarification: { context?: string; answers?: string[] } | null;
  roleWork?: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (!clarification?.context) return null;

  return (
    <div className="border-t border-[#334155]/50 pt-3 mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
      >
        {open ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
        {open ? t.taskList.hideReasoning : t.taskList.whySteps}
      </button>

      {open && (
        <div className="mt-3 p-3 bg-[#334155]/20 rounded-lg space-y-2 text-xs text-[#94A3B8]">
          <p className="font-medium text-[#F8FAFC]/80">{t.taskList.howBrokeDown}</p>
          {roleWork && (
            <p>
              <span className="text-[#F8FAFC]/60">{t.taskList.yourRole}</span>{" "}
              {roleWork}
            </p>
          )}
          <p>
            <span className="text-[#F8FAFC]/60">{t.taskList.contextLabel}</span>{" "}
            {clarification.context}
          </p>
          {clarification.answers && clarification.answers.some(Boolean) && (
            <div>
              <p className="text-[#F8FAFC]/60 mb-1">{t.taskList.yourAnswers}</p>
              {clarification.answers.filter(Boolean).map((a, i) => (
                <p key={i}>• {a}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TaskList({
  t,
  tasks,
  onStepToggle,
  onStepRegenerate,
  onTaskDelete,
  onClearAll,
  onAddMore,
}: TaskListProps) {
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  // Tracks which step is currently being regenerated (stepId or null)
  const [regeneratingStepId, setRegeneratingStepId] = useState<string | null>(null);
  // Tracks which task just had its share link copied
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);

  const handleShare = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/share`, { method: "POST" });
      if (!res.ok) throw new Error();
      const { shareToken } = await res.json();
      const url = `${window.location.origin}/shared/${shareToken}`;
      await navigator.clipboard.writeText(url);
      setCopiedTaskId(taskId);
      toast.success(t.taskList.linkCopied);
      setTimeout(() => setCopiedTaskId(null), 2000);
    } catch {
      toast.error(t.taskList.shareFailed);
    }
  };

  const handleRegenerate = async (taskId: string, stepId: string) => {
    setRegeneratingStepId(stepId);
    try {
      await onStepRegenerate(taskId, stepId);
    } finally {
      setRegeneratingStepId(null);
    }
  };

  const totalSteps = tasks.reduce((acc, task) => acc + task.steps.length, 0);
  const completedSteps = tasks.reduce(
    (acc, task) => acc + task.steps.filter((s) => s.completed).length,
    0
  );
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#F8FAFC]">{t.taskList.title}</h2>
          <p className="text-[#94A3B8] text-xs mt-1">
            {t.taskList.subtitle} — {completedSteps}/{totalSteps} {t.taskList.stepsLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAddMore}
            className="border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t.taskList.addMore}
          </Button>
          <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-[#334155] text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/30"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {t.taskList.clearAll}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1E293B] border-[#334155] text-[#F8FAFC]">
              <DialogHeader>
                <DialogTitle>{t.taskList.clearConfirmTitle}</DialogTitle>
                <DialogDescription className="text-[#94A3B8]">
                  {t.taskList.clearConfirmDescription}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setClearDialogOpen(false)}
                  className="border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50"
                >
                  {t.taskList.clearConfirmCancel}
                </Button>
                <Button
                  onClick={() => {
                    onClearAll();
                    setClearDialogOpen(false);
                  }}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  {t.taskList.clearConfirmConfirm}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Global progress bar */}
      <div className="w-full h-1.5 bg-[#334155]/50 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#86EFAC] to-emerald-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Task cards */}
      <div className="space-y-6">
        {tasks.map((task) => {
          const taskCompleted = task.steps.every((s) => s.completed);
          const completedCount = task.steps.filter((s) => s.completed).length;
          const taskProgress =
            task.steps.length > 0
              ? (completedCount / task.steps.length) * 100
              : 0;

          let clarification: { context?: string; answers?: string[] } | null = null;
          try {
            clarification = JSON.parse(task.clarification || "{}");
          } catch {
            clarification = null;
          }

          return (
            <div
              key={task.id}
              className={cn(
                "rounded-xl border p-5 transition-all duration-300",
                taskCompleted
                  ? "border-[#86EFAC]/20 bg-[#86EFAC]/5"
                  : "border-[#334155] bg-[#1E293B]/30"
              )}
            >
              {/* Task header */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3
                      className={cn(
                        "font-semibold text-base",
                        taskCompleted
                          ? "text-[#86EFAC] line-through opacity-70"
                          : "text-[#F8FAFC]"
                      )}
                    >
                      {task.originalText}
                    </h3>
                    <span className="shrink-0 text-xs text-[#94A3B8]">
                      {completedCount}/{task.steps.length}
                    </span>
                  </div>

                  {/* Per-task progress bar */}
                  <div className="w-full h-1 bg-[#334155]/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#86EFAC]/60 rounded-full transition-all duration-300"
                      style={{ width: `${taskProgress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => handleShare(task.id)}
                    className="p-1 rounded-md text-[#94A3B8] hover:text-[#86EFAC] hover:bg-[#86EFAC]/10 transition-colors"
                    aria-label={t.taskList.share}
                    title={t.taskList.share}
                  >
                    {copiedTaskId === task.id ? (
                      <Check className="w-4 h-4 text-[#86EFAC]" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => onTaskDelete(task.id)}
                    className="p-1 rounded-md text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label="Delete task"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {task.steps.map((step) => {
                  const isRegenerating = regeneratingStepId === step.id;
                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "group flex items-start gap-3 p-3 rounded-lg transition-all duration-200",
                        step.completed ? "bg-[#86EFAC]/5" : "hover:bg-[#334155]/30"
                      )}
                    >
                      <label className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer">
                        <Checkbox
                          checked={step.completed}
                          onCheckedChange={(checked) =>
                            onStepToggle(task.id, step.id, checked === true)
                          }
                          className="mt-0.5 border-[#334155] data-[state=checked]:bg-[#86EFAC] data-[state=checked]:border-[#86EFAC] data-[state=checked]:text-[#0F172A]"
                        />
                        <div className="flex flex-col gap-1">
                          <span
                            className={cn(
                              "text-sm leading-relaxed transition-all duration-200",
                              step.completed
                                ? "text-[#94A3B8] line-through"
                                : "text-[#F8FAFC]",
                              isRegenerating && "opacity-40"
                            )}
                          >
                            {isRegenerating ? t.taskList.regenerating : step.text}
                          </span>
                          {step.durationEstimate && !step.completed && (
                            <span className="inline-flex items-center w-fit px-1.5 py-0.5 rounded-md bg-[#334155]/40 text-[#86EFAC] text-[10px] font-medium border border-[#86EFAC]/10">
                              {step.durationEstimate}
                            </span>
                          )}
                        </div>
                      </label>

                      {/* Regenerate button — visible on hover or while loading */}
                      {!step.completed && (
                        <button
                          type="button"
                          disabled={isRegenerating || regeneratingStepId !== null}
                          onClick={() => handleRegenerate(task.id, step.id)}
                          title={t.taskList.regenerateStep}
                          aria-label={t.taskList.regenerateStep}
                          className={cn(
                            "shrink-0 p-1 rounded-md transition-all duration-150",
                            "text-[#94A3B8]/0 group-hover:text-[#94A3B8] hover:text-[#86EFAC] hover:bg-[#86EFAC]/10",
                            "disabled:opacity-40 disabled:cursor-not-allowed",
                            isRegenerating && "text-[#86EFAC]! opacity-100"
                          )}
                        >
                          <RefreshCw
                            className={cn(
                              "w-3.5 h-3.5",
                              isRegenerating && "animate-spin"
                            )}
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* "Why these steps?" expandable */}
              <TaskContextExplainer
                t={t}
                clarification={clarification}
                roleWork={null}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
