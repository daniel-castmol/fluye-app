"use client";

// MiniTimer — Inline timer for each planner step
// Shows MM:SS (or H:MM:SS), with a play/pause button.
// When running: green text + pulse animation on the button.
// Starting one timer auto-pauses others (handled by the parent/API).

import { Play, Pause } from "lucide-react";
import { useTimer, formatTime } from "@/hooks/useTimer";

interface MiniTimerProps {
  timeSpentSeconds: number;       // Accumulated seconds from server
  timerStartedAt: string | null;  // ISO timestamp if running, null if paused
  disabled?: boolean;             // Disable controls (e.g., on completed steps)
  onStart: () => void;            // Called when user clicks play
  onPause: () => void;            // Called when user clicks pause
}

export default function MiniTimer({
  timeSpentSeconds,
  timerStartedAt,
  disabled,
  onStart,
  onPause,
}: MiniTimerProps) {
  // useTimer handles the live countdown display
  const { elapsed, isRunning } = useTimer({ timeSpentSeconds, timerStartedAt });

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Time display — monospace for stable width, green when running */}
      <span className={`text-xs font-mono tabular-nums ${
        isRunning ? "text-[#86EFAC]" : "text-[#64748B]"
      }`}>
        {formatTime(elapsed)}
      </span>

      {/* Play/Pause toggle */}
      <button
        type="button"
        onClick={isRunning ? onPause : onStart}
        disabled={disabled}
        className={`p-1 rounded transition-colors disabled:opacity-30 ${
          isRunning
            ? "text-[#86EFAC] hover:bg-[#86EFAC]/10 animate-pulse"
            : "text-[#64748B] hover:text-[#F8FAFC]"
        }`}
      >
        {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
