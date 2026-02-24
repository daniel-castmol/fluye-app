"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Task, UserProfile } from "@/types";
import AppNavbar from "./AppNavbar";
import TaskInput from "./TaskInput";
import ClarificationChat from "./ClarificationChat";
import TaskList from "./TaskList";

type AppStep = "input" | "clarifying" | "loading" | "tasks";

interface AppShellProps {
  profile: UserProfile;
  initialTasks: Task[];
}

export default function AppShell({ profile, initialTasks }: AppShellProps) {
  const router = useRouter();
  const [step, setStep] = useState<AppStep>(
    initialTasks.length > 0 ? "tasks" : "input"
  );
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [taskInput, setTaskInput] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleTaskSubmit = useCallback(
    async (input: string) => {
      setTaskInput(input);
      setError(null);
      setStep("loading");

      try {
        const res = await fetch("/api/clarify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskInput: input }),
        });

        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setStep("clarifying");
        } else {
          await handleBreakdown(input, [], [], true);
        }
      } catch {
        setError("Failed to get clarification. Please try again.");
        setStep("input");
      }
    },
    []
  );

  const handleBreakdown = useCallback(
    async (
      input: string,
      qs: string[],
      answers: string[],
      skip: boolean
    ) => {
      setStep("loading");
      setError(null);

      try {
        const res = await fetch("/api/breakdown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskInput: input,
            questions: qs,
            answers,
            skipClarification: skip,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to break down tasks.");
          setStep("input");
          return;
        }

        const data = await res.json();
        setTasks((prev) => [...data.tasks, ...prev]);
        setStep("tasks");
        setTaskInput("");
        setQuestions([]);
      } catch {
        setError("Something went wrong. Please try again.");
        setStep("input");
      }
    },
    []
  );

  const handleClarificationSubmit = useCallback(
    (answers: string[]) => {
      handleBreakdown(taskInput, questions, answers, false);
    },
    [taskInput, questions, handleBreakdown]
  );

  const handleSkipClarification = useCallback(() => {
    handleBreakdown(taskInput, [], [], true);
  }, [taskInput, handleBreakdown]);

  const handleStepToggle = useCallback(
    async (taskId: string, stepId: string, completed: boolean) => {
      let justCompleted = false;
      let completedTaskName = "";

      setTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                steps: t.steps.map((s) =>
                  s.id === stepId ? { ...s, completed } : s
                ),
              }
            : t
        );
        if (completed) {
          const updatedTask = updated.find((t) => t.id === taskId);
          if (updatedTask && updatedTask.steps.every((s) => s.completed)) {
            justCompleted = true;
            completedTaskName = updatedTask.originalText;
          }
        }
        return updated;
      });

      if (justCompleted) {
        toast.success("Task crushed!", {
          description: completedTaskName,
          duration: 3000,
        });
      }

      try {
        await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed }),
        });
      } catch {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  steps: t.steps.map((s) =>
                    s.id === stepId ? { ...s, completed: !completed } : s
                  ),
                }
              : t
          )
        );
      }
    },
    []
  );

  const handleTaskDelete = useCallback(async (taskId: string) => {
    setTasks((prev) => {
      const remaining = prev.filter((t) => t.id !== taskId);
      if (remaining.length === 0) {
        setStep("input");
      }
      return remaining;
    });
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    } catch {
      // silently ignore — task is already removed from UI
    }
  }, []);

  const handleClearAll = useCallback(async () => {
    try {
      await fetch("/api/tasks", { method: "DELETE" });
      setTasks([]);
      setStep("input");
    } catch {
      setError("Failed to clear tasks.");
    }
  }, []);

  const handleAddMore = useCallback(() => {
    setStep("input");
    setTaskInput("");
    setQuestions([]);
    setError(null);
  }, []);

  const handleSignOut = useCallback(async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <AppNavbar profileName={profile.name} onSignOut={handleSignOut} />

      <main className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {step === "input" && (
          <TaskInput onSubmit={handleTaskSubmit} />
        )}

        {step === "clarifying" && (
          <ClarificationChat
            questions={questions}
            onSubmit={handleClarificationSubmit}
            onSkip={handleSkipClarification}
          />
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-[#334155] border-t-[#86EFAC] animate-spin" />
            </div>
            <p className="mt-6 text-[#94A3B8] text-sm animate-pulse">
              Analyzing your tasks...
            </p>
            <p className="mt-1 text-[#94A3B8]/60 text-xs">
              Using your profile + answers to create concrete steps
            </p>
          </div>
        )}

        {step === "tasks" && (
          <TaskList
            tasks={tasks}
            onStepToggle={handleStepToggle}
            onTaskDelete={handleTaskDelete}
            onClearAll={handleClearAll}
            onAddMore={handleAddMore}
          />
        )}
      </main>
    </div>
  );
}
