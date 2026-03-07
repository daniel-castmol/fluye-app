"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import type { Task } from "@/types";
import type { Translations } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

interface ArchivedTaskListProps {
  t: Translations;
  onTaskRestored: (task: Task) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ArchivedTaskList({ t, onTaskRestored }: ArchivedTaskListProps) {
  const { data, error, isLoading, mutate } = useSWR("/api/tasks?status=archived", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const [restoringId, setRestoringId] = useState<string | null>(null);

  const tasks: Task[] = data?.tasks ?? [];

  const handleRestore = useCallback(
    async (taskId: string) => {
      setRestoringId(taskId);
      try {
        const res = await fetch(`/api/tasks/${taskId}`, { method: "PATCH" });
        if (!res.ok) {
          toast.error(t.errors.restoreFailed);
          return;
        }
        const { task } = await res.json();
        
        // Optimistically update the SWR cache
        mutate({ tasks: tasks.filter((t) => t.id !== taskId) }, false);
        
        onTaskRestored(task);
      } catch {
        toast.error(t.errors.restoreFailed);
      } finally {
        setRestoringId(null);
      }
    },
    [onTaskRestored, t.errors.restoreFailed, tasks, mutate]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-[#334155] border-t-[#86EFAC] animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0 || error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[#94A3B8] text-sm">{t.taskList.archivedEmpty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const totalSteps = task.steps.length;
        const completedSteps = task.steps.filter((s) => s.completed).length;
        const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
        const isRestoring = restoringId === task.id;

        return (
          <div
            key={task.id}
            className={cn(
              "rounded-xl border border-[#334155]/60 bg-[#1E293B]/20 p-5 transition-all duration-200",
              isRestoring && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base text-[#94A3B8] line-through">
                  {task.originalText}
                </h3>
                <p className="text-xs text-[#94A3B8]/50 mt-1">
                  {completedSteps}/{totalSteps} {t.taskList.stepsLabel}
                  {task.steps.some(s => s.durationEstimate) && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-md bg-[#334155]/40 text-[#86EFAC]/40 text-[10px] font-medium border border-[#86EFAC]/5">
                      {task.steps.reduce((acc, s) => {
                        const match = s.durationEstimate?.match(/(\d+)/);
                        return acc + (match ? parseInt(match[0]) : 0);
                      }, 0)}m total
                    </span>
                  )}
                </p>
                {/* Mini progress bar */}
                <div className="w-full h-1 bg-[#334155]/40 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-[#94A3B8]/30 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Restore button */}
              <button
                type="button"
                disabled={isRestoring || restoringId !== null}
                onClick={() => handleRestore(task.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150",
                  "border-[#334155] text-[#94A3B8] hover:border-[#86EFAC]/40 hover:text-[#86EFAC] hover:bg-[#86EFAC]/5",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                <RotateCcw
                  className={cn("w-3 h-3", isRestoring && "animate-spin")}
                />
                {t.taskList.restoreTask}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
