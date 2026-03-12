"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { mutate } from "swr";
import type { Task } from "@/types";
import type { Translations } from "@/lib/i18n";
import TaskList from "./TaskList";
import EmptyState from "./EmptyState";
import ClarificationChat from "./ClarificationChat";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Trash2 } from "lucide-react";

type Step = "tasks" | "input" | "clarifying" | "loading";

interface ProjectDetailViewProps {
  t: Translations;
  projectId: string;
  language: string;
  profileId: string;
}

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
      </div>
      <p className="text-[#F8FAFC] text-sm font-medium" key={stepIndex}>
        {steps[stepIndex]}
      </p>
    </div>
  );
}

export default function ProjectDetailView({
  t,
  projectId,
  language,
  profileId,
}: ProjectDetailViewProps) {
  const router = useRouter();
  const [project, setProject] = useState<{
    id: string;
    name: string;
    emoji: string;
    color: string;
    description: string | null;
  } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("tasks");
  const [taskInput, setTaskInput] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        router.push("/app/dashboard");
        return;
      }
      const data = await res.json();
      setProject(data.project);
      setTasks(data.project.tasks || []);
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleTaskSubmit = useCallback(
    async (input: string) => {
      setTaskInput(input);
      setStep("loading");
      try {
        const res = await fetch("/api/clarify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskInput: input, language }),
        });
        const data = await res.json();
        if (data.questions?.length > 0) {
          setQuestions(data.questions);
          setStep("clarifying");
        } else {
          await handleBreakdown(input, [], [], true);
        }
      } catch {
        toast.error(t.errors.clarificationFailed);
        setStep("input");
      }
    },
    [language, t]
  );

  const handleBreakdown = useCallback(
    async (input: string, qs: string[], answers: string[], skip: boolean) => {
      setStep("loading");
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
            projectId,
          }),
        });
        if (!res.ok) {
          toast.error(t.errors.breakdownFailed);
          setStep("input");
          return;
        }
        const data = await res.json();
        setTasks((prev) => [...data.tasks, ...prev]);
        setStep("tasks");
        setTaskInput("");
        setQuestions([]);
      } catch {
        toast.error(t.errors.breakdownFailed);
        setStep("input");
      }
    },
    [language, projectId, t]
  );

  const handleStepToggle = useCallback(
    async (taskId: string, stepId: string, completed: boolean) => {
      let justCompleted = false;
      setTasks((prev) => {
        const updated = prev.map((tk) =>
          tk.id === taskId
            ? { ...tk, steps: tk.steps.map((s) => (s.id === stepId ? { ...s, completed } : s)) }
            : tk
        );
        if (completed) {
          const updatedTask = updated.find((tk) => tk.id === taskId);
          if (updatedTask?.steps.every((s) => s.completed)) justCompleted = true;
        }
        return updated;
      });
      if (justCompleted) {
        toast.success(t.taskList.taskCrushed);
        setTasks((prev) => prev.filter((tk) => tk.id !== taskId));
        mutate("/api/tasks?status=completed");
      }
      try {
        await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed }),
        });
      } catch {
        setTasks((prev) =>
          prev.map((tk) =>
            tk.id === taskId
              ? { ...tk, steps: tk.steps.map((s) => (s.id === stepId ? { ...s, completed: !completed } : s)) }
              : tk
          )
        );
      }
    },
    [t]
  );

  const handleStepRegenerate = useCallback(async (taskId: string, stepId: string) => {
    try {
      const res = await fetch("/api/regenerate-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, taskId }),
      });
      if (!res.ok) {
        toast.error("Failed to regenerate step.");
        return;
      }
      const { step } = await res.json();
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, steps: task.steps.map((s) => (s.id === stepId ? { ...s, text: step.text, durationEstimate: step.durationEstimate } : s)) }
            : task
        )
      );
    } catch {
      toast.error("Failed to regenerate step.");
    }
  }, []);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    setTasks((prev) => prev.filter((tk) => tk.id !== taskId));
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    } catch { /* silently ignore */ }
  }, []);

  const handleArchive = async () => {
    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      router.push("/app/dashboard");
    } catch {
      toast.error("Failed to archive project.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-[#1E293B] rounded w-48" />
        <div className="h-40 bg-[#1E293B] rounded-xl" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div>
      {/* Project header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.push("/app/dashboard")}
          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-2xl">{project.emoji}</span>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#F8FAFC]">{project.name}</h1>
          {project.description && (
            <p className="text-xs text-[#94A3B8] mt-0.5">{project.description}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setArchiveOpen(true)}
          className="border-[#334155] text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Task flow */}
      {step === "input" && (
        <EmptyState
          t={t}
          onSubmit={handleTaskSubmit}
          profileId={profileId}
          language={language}
          initialDraft={taskInput}
        />
      )}

      {step === "clarifying" && (
        <ClarificationChat
          t={t}
          questions={questions}
          onSubmit={(answers) => handleBreakdown(taskInput, questions, answers, false)}
          onSkip={() => handleBreakdown(taskInput, [], [], true)}
        />
      )}

      {step === "loading" && <LoadingState t={t} />}

      {step === "tasks" && (
        tasks.length === 0 ? (
          <EmptyState
            t={t}
            onSubmit={handleTaskSubmit}
            profileId={profileId}
            language={language}
          />
        ) : (
          <TaskList
            t={t}
            tasks={tasks}
            onStepToggle={handleStepToggle}
            onStepRegenerate={handleStepRegenerate}
            onTaskDelete={handleTaskDelete}
            onClearAll={() => {
              fetch("/api/tasks", { method: "DELETE" });
              setTasks([]);
            }}
            onAddMore={() => {
              setStep("input");
              setTaskInput("");
            }}
          />
        )
      )}

      {/* Archive confirmation */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="bg-[#1E293B] border-[#334155] text-[#F8FAFC]">
          <DialogHeader>
            <DialogTitle>{t.project.deleteConfirmTitle}</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              {t.project.deleteConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArchiveOpen(false)}
              className="border-[#334155] text-[#94A3B8]"
            >
              {t.project.deleteConfirmCancel}
            </Button>
            <Button onClick={handleArchive} className="bg-red-500 text-white hover:bg-red-600">
              {t.project.deleteConfirmConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
