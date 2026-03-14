"use client";

import { useState, useCallback, useEffect } from "react";
import useSWR from "swr";
import type { Translations } from "@/lib/i18n";
import type { DayPlan } from "@/types";
import { CalendarCheck, Plus, Loader2 } from "lucide-react";
import PlannerStepCard from "./PlannerStepCard";
import StepPicker from "./StepPicker";
import EndOfDayView from "./EndOfDayView";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { useApp } from "./AppContext";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface DayPlannerProps {
  t: Translations;
}

// Simple SWR fetcher — returns parsed JSON from any URL
const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ---------------------------------------------------------------------------
// DayPlanner — the main day planner component
// Shows today's plan with step list, completion, reorder, daily win,
// inline step editing, and per-step MiniTimer with auto-pause on complete.
// ---------------------------------------------------------------------------
export default function DayPlanner({ t }: DayPlannerProps) {
  const { onActiveTimerChange } = useApp();
  // Today's date in YYYY-MM-DD format (local timezone)
  const today = new Date().toLocaleDateString("en-CA");

  // -- Fetch day plan via SWR ------------------------------------------------
  const { data: plan, mutate } = useSWR<DayPlan>(
    `/api/planner?date=${today}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // -- Report active timer state to parent (sidebar indicator) ---------------
  useEffect(() => {
    if (!plan || !onActiveTimerChange) return;
    const hasRunning = plan.steps.some((s) => s.timerStartedAt);
    onActiveTimerChange(hasRunning);
  }, [plan, onActiveTimerChange]);

  // -- Local state -----------------------------------------------------------
  const [pickerOpen, setPickerOpen] = useState(false);
  const [endOfDayOpen, setEndOfDayOpen] = useState(false);
  const [dailyWin, setDailyWin] = useState<string | undefined>(undefined);

  // Initialize dailyWin from fetched plan (only on first load)
  const displayDailyWin = dailyWin ?? plan?.dailyWin ?? "";

  // -- Derived: separate active and completed steps --------------------------
  const allSteps = plan?.steps ?? [];
  const activeSteps = allSteps.filter((s) => !s.taskStep.completed);
  const completedSteps = allSteps.filter((s) => s.taskStep.completed);

  // -- Format today's date for display (e.g. "Friday, March 14") -------------
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // ---------------------------------------------------------------------------
  // Callbacks — all wrapped in useCallback to avoid unnecessary re-renders
  // ---------------------------------------------------------------------------

  /** Add selected steps from StepPicker to today's plan */
  const handleAddSteps = useCallback(
    async (stepIds: string[]) => {
      setPickerOpen(false);

      // POST new steps to the planner API
      await fetch("/api/planner/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, stepIds }),
      });

      // Refetch the plan to get updated step list
      mutate();
    },
    [today, mutate]
  );

  // ---------------------------------------------------------------------------
  // Timer callbacks — start/pause timers on individual planner steps
  // ---------------------------------------------------------------------------

  /** Start a timer — the API auto-pauses any other running timer */
  const handleTimerStart = useCallback(
    async (dayPlanStepId: string) => {
      await fetch(`/api/planner/steps/${dayPlanStepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      mutate();
    },
    [mutate]
  );

  /** Pause the running timer — finalizes elapsed time on server */
  const handleTimerPause = useCallback(
    async (dayPlanStepId: string) => {
      await fetch(`/api/planner/steps/${dayPlanStepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });
      mutate();
    },
    [mutate]
  );

  /** Save edited step text (or null to reset to AI original) */
  const handleEditStep = useCallback(
    async (taskId: string, stepId: string, text: string | null) => {
      await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEditedText: text }),
      });
      mutate();
    },
    [mutate]
  );

  /** Toggle step completion with optimistic update */
  const handleComplete = useCallback(
    async (taskId: string, stepId: string, completed: boolean) => {
      // Auto-pause timer if completing a step with a running timer
      if (completed && plan) {
        const runningStep = plan.steps.find(
          (s) => s.taskStepId === stepId && s.timerStartedAt
        );
        if (runningStep) {
          await fetch(`/api/planner/steps/${runningStep.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "pause" }),
          });
        }
      }

      // Optimistic update: toggle the step's completed state in local data
      mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            steps: current.steps.map((s) =>
              s.taskStep.id === stepId
                ? {
                    ...s,
                    taskStep: {
                      ...s.taskStep,
                      completed,
                      completedAt: completed
                        ? new Date().toISOString()
                        : null,
                    },
                  }
                : s
            ),
          };
        },
        false // Don't revalidate yet — we'll do it after the PATCH
      );

      // Persist the change on the server
      await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      // Revalidate to sync with server state
      mutate();
    },
    [plan, mutate]
  );

  /** Remove a step from the day plan with optimistic update */
  const handleRemove = useCallback(
    async (dayPlanStepId: string) => {
      // Optimistic: filter out the removed step immediately
      mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            steps: current.steps.filter((s) => s.id !== dayPlanStepId),
          };
        },
        false
      );

      // Delete on the server
      await fetch(`/api/planner/steps/${dayPlanStepId}`, {
        method: "DELETE",
      });

      // Revalidate
      mutate();
    },
    [mutate]
  );

  /** Reorder a step up or down with optimistic update */
  const handleReorder = useCallback(
    async (stepId: string, direction: "up" | "down") => {
      // Work with active steps only (completed steps don't get reordered)
      const currentActive = (plan?.steps ?? []).filter(
        (s) => !s.taskStep.completed
      );
      const idx = currentActive.findIndex((s) => s.id === stepId);
      if (idx === -1) return;

      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= currentActive.length) return;

      // Swap sortOrder values between the two steps
      const newSteps = [...currentActive];
      const tempOrder = newSteps[idx].sortOrder;
      newSteps[idx] = { ...newSteps[idx], sortOrder: newSteps[swapIdx].sortOrder };
      newSteps[swapIdx] = { ...newSteps[swapIdx], sortOrder: tempOrder };

      // Build the reordered full list (swapped active steps + completed steps)
      const completedList = (plan?.steps ?? []).filter(
        (s) => s.taskStep.completed
      );
      // Swap positions in the array
      const swapped = [...currentActive];
      [swapped[idx], swapped[swapIdx]] = [swapped[swapIdx], swapped[idx]];
      // Update sortOrders to match new positions
      const withNewOrders = swapped.map((s, i) => ({ ...s, sortOrder: i }));

      // Optimistic update
      mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            steps: [...withNewOrders, ...completedList],
          };
        },
        false
      );

      // Persist new sort orders on server
      await fetch("/api/planner/steps/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orders: withNewOrders.map((s) => ({
            id: s.id,
            sortOrder: s.sortOrder,
          })),
        }),
      });

      // Revalidate
      mutate();
    },
    [plan, mutate]
  );

  /** Save daily win text on blur */
  const handleDailyWinBlur = useCallback(async () => {
    if (!plan?.id) return;

    await fetch("/api/planner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: plan.id, dailyWin: displayDailyWin }),
    });

    mutate();
  }, [plan?.id, displayDailyWin, mutate]);

  /** Save end-of-day reflection data and optionally roll over incomplete steps */
  const handleEndOfDaySave = useCallback(
    async (data: {
      dailyWin: string | null;
      reflection: string | null;
      mood: number | null;
      rollover: boolean;
    }) => {
      const { rollover, ...planData } = data;

      // Save reflection data (dailyWin, reflection, mood) to the day plan
      await fetch("/api/planner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...planData, date: today }),
      });

      // Roll over incomplete steps to tomorrow if requested
      if (rollover && plan) {
        const incompleteStepIds = plan.steps
          .filter((s) => !s.taskStep.completed)
          .map((s) => s.taskStepId);

        if (incompleteStepIds.length > 0) {
          // Calculate tomorrow's date string (YYYY-MM-DD)
          const tomorrow = new Date(today + "T12:00:00");
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toLocaleDateString("en-CA");

          await fetch("/api/planner/steps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskStepIds: incompleteStepIds,
              date: tomorrowStr,
            }),
          });
        }
      }

      // Sync local dailyWin state with what was saved
      setDailyWin(data.dailyWin ?? "");
      setEndOfDayOpen(false);
      mutate();
    },
    [today, plan, mutate]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* ---- Header: icon, title, date, and "Add Steps" button ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarCheck className="w-6 h-6 text-[#86EFAC]" />
          <div>
            <h1 className="text-xl font-bold text-[#F8FAFC]">
              {t.planner.title}
            </h1>
            <p className="text-sm text-[#64748B]">{formattedDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Wrap up button — only shown when plan has steps */}
          {plan && plan.steps.length > 0 && (
            <button
              type="button"
              onClick={() => setEndOfDayOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#334155]/50 text-[#F8FAFC] border border-[#334155] hover:bg-[#334155] text-sm font-medium transition-colors"
            >
              {t.planner.wrapUp}
            </button>
          )}

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-[#86EFAC] text-[#0F172A] hover:bg-[#86EFAC]/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.planner.addSteps}
          </button>
        </div>
      </div>

      {/* ---- Daily Win input ---- */}
      <input
        type="text"
        value={displayDailyWin}
        onChange={(e) => setDailyWin(e.target.value)}
        onBlur={handleDailyWinBlur}
        placeholder={t.planner.dailyWinPlaceholder}
        className="w-full px-4 py-2.5 rounded-xl bg-[#1E293B] border border-[#334155] text-sm text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#86EFAC]/50 transition-colors"
      />

      {/* ---- Step list ---- */}
      {!plan ? (
        // Loading state — plan hasn't been fetched yet
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#86EFAC] animate-spin" />
        </div>
      ) : allSteps.length === 0 ? (
        // Empty state — no steps planned yet
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <CalendarCheck className="w-10 h-10 text-[#334155]" />
          <h2 className="text-base font-semibold text-[#F8FAFC]">
            {t.planner.emptyTitle}
          </h2>
          <p className="text-sm text-[#64748B] inline-flex items-center gap-1">
            {t.planner.emptySubtitle}
            <HintTooltip text={t.hints.plannerEmpty} />
          </p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[#86EFAC] text-[#0F172A] hover:bg-[#86EFAC]/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.planner.addFirst}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ---- Active (uncompleted) steps ---- */}
          <div className="space-y-2">
            {activeSteps.map((step, idx) => (
              <PlannerStepCard
                key={step.id}
                t={t}
                step={step}
                isFirst={idx === 0}
                isLast={idx === activeSteps.length - 1}
                onComplete={handleComplete}
                onMoveUp={(id) => handleReorder(id, "up")}
                onMoveDown={(id) => handleReorder(id, "down")}
                onRemove={handleRemove}
                onTimerStart={handleTimerStart}
                onTimerPause={handleTimerPause}
                onEditStep={handleEditStep}
              />
            ))}
          </div>

          {/* ---- Completed steps section (separated at the bottom) ---- */}
          {completedSteps.length > 0 && (
            <div className="space-y-2">
              {/* Section divider with completed count */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#334155]">
                <span className="text-xs text-[#64748B] font-medium">
                  {t.planner.completed} ({completedSteps.length})
                </span>
              </div>

              {completedSteps.map((step) => (
                <PlannerStepCard
                  key={step.id}
                  t={t}
                  step={step}
                  isFirst={true}
                  isLast={true}
                  onComplete={handleComplete}
                  onMoveUp={() => {}}
                  onMoveDown={() => {}}
                  onRemove={handleRemove}
                  onTimerStart={handleTimerStart}
                  onTimerPause={handleTimerPause}
                  onEditStep={handleEditStep}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- StepPicker modal — select steps to add to today's plan ---- */}
      <StepPicker
        t={t}
        open={pickerOpen}
        date={today}
        onClose={() => setPickerOpen(false)}
        onAdd={handleAddSteps}
      />

      {/* ---- EndOfDayView modal — wrap up the day with stats & reflection ---- */}
      {endOfDayOpen && plan && (
        <EndOfDayView
          t={t}
          dayPlan={plan}
          onSave={handleEndOfDaySave}
          onClose={() => setEndOfDayOpen(false)}
        />
      )}
    </div>
  );
}
