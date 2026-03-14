"use client";

// useTimer — Calculates elapsed time from server-side timestamps
//
// How it works:
//   - The server stores `timerStartedAt` (when timer was started) and
//     `timeSpentSeconds` (accumulated time from previous sessions)
//   - This hook computes the DISPLAY value: timeSpentSeconds + (now - timerStartedAt)
//   - The setInterval is for DISPLAY REFRESH ONLY — actual time is always
//     computed from timestamps, never accumulated client-side
//   - This means page reloads, tab switches, etc. don't lose time

import { useState, useEffect, useRef } from "react";

interface UseTimerProps {
  timeSpentSeconds: number;      // Accumulated time from paused sessions
  timerStartedAt: string | null; // ISO string when timer started, null if paused
}

export function useTimer({ timeSpentSeconds, timerStartedAt }: UseTimerProps) {
  // Calculate initial elapsed time
  const [elapsed, setElapsed] = useState(() => {
    if (timerStartedAt) {
      return timeSpentSeconds + Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000);
    }
    return timeSpentSeconds;
  });

  const isRunning = !!timerStartedAt;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerStartedAt) {
      const startTime = new Date(timerStartedAt).getTime();

      // Recalculate from timestamp every second (not accumulating!)
      const tick = () => {
        setElapsed(timeSpentSeconds + Math.floor((Date.now() - startTime) / 1000));
      };

      tick(); // Sync immediately on mount/change
      intervalRef.current = setInterval(tick, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      // Timer paused — just show accumulated time
      setElapsed(timeSpentSeconds);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [timerStartedAt, timeSpentSeconds]);

  return { elapsed, isRunning };
}

// formatTime — Converts seconds to human-readable MM:SS or H:MM:SS
export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
