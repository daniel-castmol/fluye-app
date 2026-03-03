"use client";

import { useState, useEffect, useCallback } from "react";
import type { Task } from "@/types";
import type { Translations } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

interface ArchivedTaskListProps {
  t: Translations;
  onTaskRestored: (task: Task) => void;
}

export default function ArchivedTaskList({ t, onTaskRestored }: ArchivedTaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Fetch archived tasks when the tab becomes visible
  useEffect(() => {
    async function fetchArchived() {
      setLoading(true);
      try {
        const res = await fetch("/api/tasks?status=archived");
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchArchived();
  }, []);

  const handleRestore = useCallback(
    async (taskId: string) => {
      setRestoringId(taskId);
      try {
        const res = await fetch(`/api/tasks/${taskId}`, { method: "PATCH" });
        if (!res.ok) return;
        const { task } = await res.json();
        // Remove from archived list + bubble up to parent
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        onTaskRestored(task);
      } finally {
        setRestoringId(null);
      }
    },
    [onTaskRestored]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-[#334155] border-t-[#86EFAC] animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0) {
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
