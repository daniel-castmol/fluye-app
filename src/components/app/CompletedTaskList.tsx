"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { RotateCcw, CheckCircle2 } from "lucide-react";
import type { Task } from "@/types";
import type { Translations } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface CompletedTaskListProps {
  t: Translations;
  onTaskReopened: (task: Task) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CompletedTaskList({ t, onTaskReopened }: CompletedTaskListProps) {
  const { data, error, isLoading } = useSWR("/api/tasks?status=completed", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const [reopeningId, setReopeningId] = useState<string | null>(null);

  const tasks: Task[] = data?.tasks ?? [];

  const handleReopen = useCallback(
    async (taskId: string) => {
      setReopeningId(taskId);
      try {
        const res = await fetch(`/api/tasks/${taskId}`, { method: "PATCH" });
        if (!res.ok) {
          toast.error(t.completedList.reopenFailed);
          return;
        }
        const { task } = await res.json();
        
        // Optimistically update the SWR cache
        mutate("/api/tasks?status=completed", { tasks: tasks.filter((t) => t.id !== taskId) }, false);
        
        onTaskReopened(task);
      } catch {
        toast.error(t.completedList.reopenFailed);
      } finally {
        setReopeningId(null);
      }
    },
    [onTaskReopened, t.completedList.reopenFailed, tasks]
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
        <p className="text-[#94A3B8] text-sm">{t.completedList.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const totalSteps = task.steps.length;
        const isReopening = reopeningId === task.id;

        return (
          <div
            key={task.id}
            className={cn(
              "rounded-xl border border-[#86EFAC]/20 bg-[#86EFAC]/5 p-5 transition-all duration-200",
              isReopening && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#86EFAC] shrink-0" />
                  <h3 className="font-semibold text-base text-[#86EFAC]/80 line-through">
                    {task.originalText}
                  </h3>
                </div>
                <p className="text-xs text-[#94A3B8]/50 mt-1 ml-6">
                  {totalSteps}/{totalSteps} {t.completedList.stepsLabel}
                  {task.steps.some(s => s.durationEstimate) && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-md bg-[#334155]/40 text-[#86EFAC]/40 text-[10px] font-medium border border-[#86EFAC]/5">
                      {task.steps.reduce((acc, s) => {
                        const match = s.durationEstimate?.match(/(\d+)/);
                        return acc + (match ? parseInt(match[0]) : 0);
                      }, 0)}m total
                    </span>
                  )}
                </p>
                {/* Full progress bar */}
                <div className="w-full h-1 bg-[#334155]/40 rounded-full overflow-hidden mt-2 ml-6">
                  <div className="h-full bg-[#86EFAC]/40 rounded-full w-full" />
                </div>
              </div>

              {/* Reopen button */}
              <button
                type="button"
                disabled={isReopening || reopeningId !== null}
                onClick={() => handleReopen(task.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150",
                  "border-[#334155] text-[#94A3B8] hover:border-[#86EFAC]/40 hover:text-[#86EFAC] hover:bg-[#86EFAC]/5",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                <RotateCcw className={cn("w-3 h-3", isReopening && "animate-spin")} />
                {t.completedList.reopenTask}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
