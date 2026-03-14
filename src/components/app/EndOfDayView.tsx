"use client";

// EndOfDayView — End-of-day reflection modal
//
// Shows daily stats (steps completed, total time), lets user record a daily
// win, mood (1-5 emoji scale), free-text reflection, and optionally roll
// over incomplete steps to tomorrow.

import { useState } from "react";
import type { Translations } from "@/lib/i18n";
import type { DayPlan } from "@/types";
import { formatTime } from "@/hooks/useTimer";
import { X } from "lucide-react";
import { HintTooltip } from "@/components/ui/hint-tooltip";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface EndOfDayViewProps {
  t: Translations;
  dayPlan: DayPlan;
  onSave: (data: {
    dailyWin: string | null;
    reflection: string | null;
    mood: number | null;
    rollover: boolean;
  }) => void;
  onClose: () => void;
}

// Mood emojis mapped to values 1-5
const MOOD_OPTIONS = [
  { value: 1, emoji: "😣" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "😄" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function EndOfDayView({
  t,
  dayPlan,
  onSave,
  onClose,
}: EndOfDayViewProps) {
  // -- Local state (pre-filled from existing plan data) ---------------------
  const [dailyWin, setDailyWin] = useState(dayPlan.dailyWin || "");
  const [reflection, setReflection] = useState(dayPlan.reflection || "");
  const [mood, setMood] = useState<number | null>(dayPlan.mood);
  const [rollover, setRollover] = useState(true); // Default: roll over

  // -- Derived stats --------------------------------------------------------
  const completedCount = dayPlan.steps.filter(
    (s) => s.taskStep.completed
  ).length;
  const totalCount = dayPlan.steps.length;
  const incompleteCount = totalCount - completedCount;

  // Total time tracked — includes elapsed time from any currently running timer
  // We capture "now" once at mount so the render stays pure (React Compiler rule)
  const [mountTime] = useState(() => Date.now());
  const totalSeconds = dayPlan.steps.reduce((acc, s) => {
    let elapsed = s.timeSpentSeconds;
    if (s.timerStartedAt) {
      elapsed += Math.floor(
        (mountTime - new Date(s.timerStartedAt).getTime()) / 1000
      );
    }
    return acc + elapsed;
  }, 0);

  // -- Save handler ---------------------------------------------------------
  const handleSave = () => {
    onSave({
      dailyWin: dailyWin.trim() || null,
      reflection: reflection.trim() || null,
      mood,
      rollover,
    });
    onClose();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    // Dark overlay — clicking outside the modal closes it
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      {/* Modal card — stop click propagation so clicking inside doesn't close */}
      <div
        className="w-full max-w-lg rounded-2xl bg-[#1E293B] border border-[#334155] p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#F8FAFC]">
            {t.endOfDay.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#334155] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ---- Stats row: two cards side by side ---- */}
        <div className="grid grid-cols-2 gap-3">
          {/* Steps completed */}
          <div className="rounded-xl bg-[#0F172A] border border-[#334155] p-3 text-center">
            <p className="text-2xl font-bold text-[#86EFAC]">
              {completedCount}/{totalCount}
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              {t.endOfDay.stepsCompleted}
            </p>
          </div>

          {/* Total time tracked */}
          <div className="rounded-xl bg-[#0F172A] border border-[#334155] p-3 text-center">
            <p className="text-2xl font-bold text-[#86EFAC]">
              {formatTime(totalSeconds)}
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              {t.endOfDay.totalTime}
            </p>
          </div>
        </div>

        {/* ---- Daily Win input ---- */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1 text-sm font-medium text-[#F8FAFC] mb-1.5">
            {t.endOfDay.dailyWinLabel}
            <HintTooltip text={t.hints.dailyWin} />
          </label>
          <input
            type="text"
            value={dailyWin}
            onChange={(e) => setDailyWin(e.target.value)}
            placeholder={t.endOfDay.dailyWinPlaceholder}
            className="w-full px-4 py-2.5 rounded-xl bg-[#0F172A] border border-[#334155] text-sm text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#86EFAC]/50 transition-colors"
          />
        </div>

        {/* ---- Mood selector: 5 emoji buttons ---- */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1 text-sm font-medium text-[#F8FAFC] mb-1.5">
            {t.endOfDay.moodLabel}
            <HintTooltip text={t.hints.moodSelector} />
          </label>
          <div className="flex gap-2">
            {MOOD_OPTIONS.map(({ value, emoji }) => (
              <button
                key={value}
                type="button"
                // Click to select, click again to deselect
                onClick={() => setMood(mood === value ? null : value)}
                className={`flex-1 py-2 rounded-xl text-xl transition-all ${
                  mood === value
                    ? "bg-[#86EFAC]/20 border-2 border-[#86EFAC] scale-110"
                    : "bg-[#0F172A] border border-[#334155] hover:border-[#475569]"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* ---- Reflection textarea ---- */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#F8FAFC]">
            {t.endOfDay.reflectionLabel}
          </label>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder={t.endOfDay.reflectionPlaceholder}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-[#0F172A] border border-[#334155] text-sm text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#86EFAC]/50 transition-colors resize-none"
          />
        </div>

        {/* ---- Rollover checkbox (only when there are incomplete steps) ---- */}
        {incompleteCount > 0 && (
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={rollover}
              onChange={(e) => setRollover(e.target.checked)}
              className="w-4 h-4 rounded border-[#334155] bg-[#0F172A] text-[#86EFAC] focus:ring-[#86EFAC]/50 accent-[#86EFAC]"
            />
            <span className="text-sm text-[#94A3B8] group-hover:text-[#F8FAFC] transition-colors">
              {t.endOfDay.rolloverLabel} ({incompleteCount})
            </span>
          </label>
        )}

        {/* ---- Footer: Save & Close button ---- */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#86EFAC] text-[#0F172A] hover:bg-[#86EFAC]/90 transition-colors"
        >
          {t.endOfDay.saveClose}
        </button>
      </div>
    </div>
  );
}
