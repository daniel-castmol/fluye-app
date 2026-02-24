"use client";

import { useState } from "react";
import type { Task } from "@/types";
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
import { Plus, Trash2, X } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  onStepToggle: (taskId: string, stepId: string, completed: boolean) => void;
  onTaskDelete: (taskId: string) => void;
  onClearAll: () => void;
  onAddMore: () => void;
}

export default function TaskList({
  tasks,
  onStepToggle,
  onTaskDelete,
  onClearAll,
  onAddMore,
}: TaskListProps) {
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const totalSteps = tasks.reduce((acc, t) => acc + t.steps.length, 0);
  const completedSteps = tasks.reduce(
    (acc, t) => acc + t.steps.filter((s) => s.completed).length,
    0
  );
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#F8FAFC]">
            Your Tasks
          </h2>
          <p className="text-[#94A3B8] text-xs mt-1">
            Concrete & Achievable — {completedSteps}/{totalSteps} steps done
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
            Add More
          </Button>
          <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-[#334155] text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/30"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1E293B] border-[#334155] text-[#F8FAFC]">
              <DialogHeader>
                <DialogTitle>Clear all tasks?</DialogTitle>
                <DialogDescription className="text-[#94A3B8]">
                  This will archive all your current tasks. You won&apos;t be
                  able to undo this action.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setClearDialogOpen(false)}
                  className="border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onClearAll();
                    setClearDialogOpen(false);
                  }}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  Clear All
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="w-full h-1.5 bg-[#334155]/50 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#86EFAC] to-emerald-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-6">
        {tasks.map((task) => {
          const taskCompleted = task.steps.every((s) => s.completed);
          let context: string | null = null;
          try {
            const parsed = JSON.parse(task.clarification || "{}");
            context = parsed.context || null;
          } catch {
            context = null;
          }

          return (
            <div
              key={task.id}
              className={`rounded-xl border p-5 transition-all duration-300 ${
                taskCompleted
                  ? "border-[#86EFAC]/20 bg-[#86EFAC]/5"
                  : "border-[#334155] bg-[#1E293B]/30"
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <h3
                    className={`font-semibold text-base ${
                      taskCompleted
                        ? "text-[#86EFAC] line-through opacity-70"
                        : "text-[#F8FAFC]"
                    }`}
                  >
                    {task.originalText}
                  </h3>
                  {context && (
                    <p className="text-[#94A3B8] text-xs mt-1">
                      Context: {context}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onTaskDelete(task.id)}
                  className="shrink-0 p-1 rounded-md text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  aria-label="Delete task"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {task.steps.map((step) => (
                  <label
                    key={step.id}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      step.completed
                        ? "bg-[#86EFAC]/5"
                        : "hover:bg-[#334155]/30"
                    }`}
                  >
                    <Checkbox
                      checked={step.completed}
                      onCheckedChange={(checked) =>
                        onStepToggle(task.id, step.id, checked === true)
                      }
                      className="mt-0.5 border-[#334155] data-[state=checked]:bg-[#86EFAC] data-[state=checked]:border-[#86EFAC] data-[state=checked]:text-[#0F172A]"
                    />
                    <span
                      className={`text-sm leading-relaxed transition-all duration-200 ${
                        step.completed
                          ? "text-[#94A3B8] line-through"
                          : "text-[#F8FAFC]"
                      }`}
                    >
                      {step.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
