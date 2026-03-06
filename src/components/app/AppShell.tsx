"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Task, UserProfile } from "@/types";
import { getTranslations, type Language } from "@/lib/i18n";
import AppNavbar from "./AppNavbar";
import EditProfileModal from "./EditProfileModal";
import EmptyState, { invalidateChipsCache } from "./EmptyState";
import ClarificationChat from "./ClarificationChat";
import TaskList from "./TaskList";
import ArchivedTaskList from "./ArchivedTaskList";
import CompletedTaskList, { invalidateCompletedCache } from "./CompletedTaskList";

type AppStep = "input" | "clarifying" | "loading" | "tasks";

interface AppShellProps {
  profile: UserProfile;
  initialTasks: Task[];
}

export default function AppShell({ profile, initialTasks }: AppShellProps) {
  const router = useRouter();

  // Language state lives here so the toggle re-renders all children immediately.
  // Background-synced to profile so the preference persists across sessions.
  const [language, setLanguage] = useState<Language>(
    (profile.preferredLanguage as Language) || "en"
  );
  const t = getTranslations(language);

  // Profile name tracked in state so Edit Profile updates navbar immediately
  const [profileName, setProfileName] = useState(profile.name);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const handleLanguageChange = useCallback(
    async (lang: Language) => {
      setLanguage(lang);
      // Fire-and-forget — we don't block the UI on this
      fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: lang }),
      }).catch(() => {
        // Ignore sync errors; the in-session language change is already applied
      });
    },
    []
  );

  const [step, setStep] = useState<AppStep>(
    initialTasks.length > 0 ? "tasks" : "input"
  );
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "archived">("active");
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
        setTasks((prev) => {
          const remaining = prev.filter((t) => t.id !== taskId);
          if (remaining.length === 0) setStep("input");
          return remaining;
        });
        invalidateCompletedCache();
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
    setTasks((prev) => {
      const remaining = prev.filter((t) => t.id !== taskId);
      if (remaining.length === 0) setStep("input");
      return remaining;
    });
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
                    s.id === stepId ? { ...s, text: step.text } : s
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

  const handleProfileSaved = useCallback(
    ({ name, preferredLanguage }: { name: string; preferredLanguage: Language }) => {
      setProfileName(name);
      setLanguage(preferredLanguage);
      // Role/projects may have changed — bust the chip cache so EmptyState
      // fetches fresh context-aware suggestions on next open
      invalidateChipsCache();
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <AppNavbar
        profileName={profileName}
        language={language}
        onLanguageChange={handleLanguageChange}
        onEditProfile={() => setEditProfileOpen(true)}
        onSignOut={handleSignOut}
      />

      <EditProfileModal
        t={t}
        profile={{ ...profile, name: profileName, preferredLanguage: language }}
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        onSaved={handleProfileSaved}
      />

      <main className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {step === "input" && (
          <EmptyState
            t={t}
            onSubmit={handleTaskSubmit}
            profileId={profile.id}
            language={language}
            onCancel={tasks.length > 0 ? () => setStep("tasks") : undefined}
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
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-[#334155] border-t-[#86EFAC] animate-spin" />
            </div>
            <p className="mt-6 text-[#94A3B8] text-sm animate-pulse">
              {t.loading.analyzing}
            </p>
            <p className="mt-1 text-[#94A3B8]/60 text-xs">{t.loading.subtitle}</p>
          </div>
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
              <TaskList
                t={t}
                tasks={tasks}
                onStepToggle={handleStepToggle}
                onStepRegenerate={handleStepRegenerate}
                onTaskDelete={handleTaskDelete}
                onClearAll={handleClearAll}
                onAddMore={handleAddMore}
              />
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
      </main>
    </div>
  );
}
