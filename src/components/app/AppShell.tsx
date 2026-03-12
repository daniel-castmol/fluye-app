"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import type { Task, UserProfile } from "@/types";
import { getTranslations, type Language, type Translations } from "@/lib/i18n";
import EmptyState from "./EmptyState";
import ClarificationChat from "./ClarificationChat";
import TaskList from "./TaskList";
import ArchivedTaskList from "./ArchivedTaskList";
import CompletedTaskList from "./CompletedTaskList";

type AppStep = "input" | "clarifying" | "loading" | "tasks";

/** Rotating "active thinking" messages during AI processing */
function LoadingState({ t }: { t: Translations }) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = t.loading.steps;

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative mb-8">
        <div className="w-16 h-16 rounded-full border-2 border-[#334155] border-t-[#86EFAC] animate-spin" />
        <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-b-[#86EFAC]/30 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
      </div>
      <p className="text-[#F8FAFC] text-sm font-medium transition-opacity duration-300" key={stepIndex}>
        {steps[stepIndex]}
      </p>
      <p className="mt-2 text-[#94A3B8]/50 text-xs">{t.loading.subtitle}</p>
    </div>
  );
}

interface AppShellProps {
  profile: UserProfile;
  initialTasks: Task[];
}

export default function AppShell({ profile, initialTasks }: AppShellProps) {
  // Language from profile (layout handles the toggle now)
  const language = (profile.preferredLanguage as Language) || "en";
  const t = getTranslations(language);

  // Always start in "tasks" so the tab bar is always accessible.
  // The active tab shows EmptyState inline when there are no active tasks.
  const [step, setStep] = useState<AppStep>("tasks");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "archived">("active");
  // Auto-save draft: restore from localStorage on mount, persist on change
  const DRAFT_KEY = "fluye_task_draft";
  const [taskInput, setTaskInput] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return localStorage.getItem(DRAFT_KEY) || ""; } catch { return ""; }
  });
  const [questions, setQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Persist draft to localStorage (debounced via effect)
  useEffect(() => {
    try {
      if (taskInput) {
        localStorage.setItem(DRAFT_KEY, taskInput);
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch { /* ignore */ }
  }, [taskInput]);

  const handleTaskSubmit = useCallback(
    async (input: string) => {
      setTaskInput(input);
      setError(null);
      setStep("loading");

      try {
        const res = await fetch("/api/clarify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskInput: input, language }),
        });

        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setStep("clarifying");
        } else {
          await handleBreakdown(input, [], [], true);
        }
      } catch {
        setError(t.errors.clarificationFailed);
        setStep("input");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
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
            language,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || t.errors.breakdownFailed);
          setStep("input");
          return;
        }

        const data = await res.json();
        setTasks((prev) => [...data.tasks, ...prev]);
        setStep("tasks");
        setTaskInput("");
        setQuestions([]);
      } catch {
        setError(t.errors.breakdownFailed);
        setStep("input");
      }
    },
    [t]
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
        toast.success(t.taskList.taskCrushed, {
          description: completedTaskName,
          duration: 3000,
        });
        // Remove from active list and invalidate completed cache so the
        // Completed tab shows it on next open
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        mutate("/api/tasks?status=completed");
      }

      try {
        await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed }),
        });
      } catch {
        // Roll back optimistic update on failure
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
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    } catch {
      // silently ignore — task already removed from UI
    }
  }, []);

  const handleStepRegenerate = useCallback(
    async (taskId: string, stepId: string) => {
      try {
        const res = await fetch("/api/regenerate-step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stepId, taskId }),
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to regenerate step.");
          return;
        }

        const { step } = await res.json();

        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  steps: task.steps.map((s) =>
                    s.id === stepId ? { ...s, text: step.text, durationEstimate: step.durationEstimate } : s
                  ),
                }
              : task
          )
        );
      } catch {
        toast.error("Failed to regenerate step. Please try again.");
      }
    },
    []
  );

  const handleClearAll = useCallback(async () => {
    try {
      await fetch("/api/tasks", { method: "DELETE" });
      setTasks([]);
      setStep("input");
    } catch {
      setError(t.errors.clearFailed);
    }
  }, [t]);

  const handleAddMore = useCallback(() => {
    setStep("input");
    setTaskInput("");
    setQuestions([]);
    setError(null);
    setActiveTab("active");
  }, []);

  const handleTaskRestored = useCallback((task: Task) => {
    setTasks((prev) => [task, ...prev]);
    setStep("tasks");
    setActiveTab("active");
  }, []);

  const handleTaskReopened = useCallback((task: Task) => {
    // Unchecking all steps so it's actionable again
    const reopened = {
      ...task,
      steps: task.steps.map((s) => ({ ...s, completed: false })),
    };
    setTasks((prev) => [reopened, ...prev]);
    setStep("tasks");
    setActiveTab("active");
  }, []);

  return (
    <div>
      {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm flex items-center justify-between gap-3">
            <span>{error}</span>
            {taskInput && (
              <button
                type="button"
                onClick={() => handleTaskSubmit(taskInput)}
                className="shrink-0 px-3 py-1 rounded-lg bg-red-500/20 text-red-200 text-xs font-medium hover:bg-red-500/30 transition-colors"
              >
                {t.errors.breakdownRetry}
              </button>
            )}
          </div>
        )}

        {step === "input" && (
          <EmptyState
            t={t}
            onSubmit={handleTaskSubmit}
            profileId={profile.id}
            language={language}
            initialDraft={taskInput}
          />
        )}

        {step === "clarifying" && (
          <ClarificationChat
            t={t}
            questions={questions}
            onSubmit={handleClarificationSubmit}
            onSkip={handleSkipClarification}
          />
        )}

        {step === "loading" && (
          <LoadingState t={t} />
        )}

        {step === "tasks" && (
          <div>
            {/* Tab bar */}
            <div className="flex gap-1 mb-8 p-1 bg-[#1E293B]/50 rounded-xl border border-[#334155]/50 w-fit">
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  activeTab === "active"
                    ? "bg-[#334155] text-[#F8FAFC] shadow-sm"
                    : "text-[#94A3B8] hover:text-[#F8FAFC]"
                }`}
              >
                {t.tabs.active}
                {tasks.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-md bg-[#86EFAC]/10 text-[#86EFAC] text-xs">
                    {tasks.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("completed")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  activeTab === "completed"
                    ? "bg-[#334155] text-[#F8FAFC] shadow-sm"
                    : "text-[#94A3B8] hover:text-[#F8FAFC]"
                }`}
              >
                {t.tabs.completed}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("archived")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  activeTab === "archived"
                    ? "bg-[#334155] text-[#F8FAFC] shadow-sm"
                    : "text-[#94A3B8] hover:text-[#F8FAFC]"
                }`}
              >
                {t.tabs.archived}
              </button>
            </div>

            {activeTab === "active" && (
              tasks.length === 0 ? (
                <EmptyState
                  t={t}
                  onSubmit={handleTaskSubmit}
                  profileId={profile.id}
                  language={language}
                />
              ) : (
                <TaskList
                  t={t}
                  tasks={tasks}
                  onStepToggle={handleStepToggle}
                  onStepRegenerate={handleStepRegenerate}
                  onTaskDelete={handleTaskDelete}
                  onClearAll={handleClearAll}
                  onAddMore={handleAddMore}
                />
              )
            )}

            {activeTab === "completed" && (
              <CompletedTaskList
                t={t}
                onTaskReopened={handleTaskReopened}
              />
            )}

            {activeTab === "archived" && (
              <ArchivedTaskList
                t={t}
                onTaskRestored={handleTaskRestored}
              />
            )}
          </div>
        )}
    </div>
  );
}
