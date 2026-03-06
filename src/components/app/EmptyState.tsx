"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import TaskForm from "@/components/app/TaskForm";
import type { Translations } from "@/lib/i18n";

const CACHE_KEY = "fluye_example_chips";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface ChipCache {
  chips: string[];
  profileId: string;
  language: string;
  cachedAt: number;
}

/** Call this after saving profile (role/projects changed) to force fresh chips. */
export function invalidateChipsCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore storage errors
  }
}

interface EmptyStateProps {
  t: Translations;
  onSubmit: (input: string) => void;
  /** Used to key the localStorage chip cache — re-fetches when profile changes. */
  profileId: string;
  /** When provided, shows a cancel button to return to the task list. */
  onCancel?: () => void;
  language?: string;
}

export default function EmptyState({ t, onSubmit, profileId, onCancel, language }: EmptyStateProps) {
  const [input, setInput] = useState("");
  // Start with static fallback chips so the UI is never empty
  const [chips, setChips] = useState<string[]>(t.empty.exampleList);
  const [loadingChips, setLoadingChips] = useState(false);

  useEffect(() => {
    // Check localStorage cache first
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: ChipCache = JSON.parse(raw);
        const isValid =
          cached.profileId === profileId &&
          cached.language === (language ?? "en") &&
          Date.now() - cached.cachedAt < CACHE_TTL_MS;
        if (isValid) {
          setChips(cached.chips);
          return;
        }
      }
    } catch {
      // ignore parse errors — fall through to fetch
    }

    // Fetch personalised chips from the API (pass language so chips are in the right language)
    setLoadingChips(true);
    const langParam = language ? `?language=${language}` : "";
    fetch(`/api/example-chips${langParam}`)
      .then((res) => res.json())
      .then(({ chips: fetched }: { chips: string[] }) => {
        if (Array.isArray(fetched) && fetched.length > 0) {
          setChips(fetched);
          const cache: ChipCache = {
            chips: fetched,
            profileId,
            language: language ?? "en",
            cachedAt: Date.now(),
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        }
      })
      .catch(() => {
        // Keep static fallback chips on network/parse failure
      })
      .finally(() => setLoadingChips(false));
  }, [profileId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmit(input.trim());
  }

  function handleExampleClick(example: string) {
    setInput(example);
    // Small delay so user sees the fill-in before auto-focus
    setTimeout(() => {
      document.getElementById("task-input-textarea")?.focus();
    }, 50);
  }

  return (
    <div className="w-full">
      {/* Cancel button — shown when user came from the task list */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mb-6 text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors duration-150"
        >
          {t.empty.cancelButton}
        </button>
      )}

      {/* Hero header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-[#86EFAC]/20 bg-[#86EFAC]/5 text-[#86EFAC] text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-powered task breakdown</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-[#F8FAFC] mb-4 leading-tight tracking-tight">
          {t.empty.title}
        </h1>
        <p className="text-[#94A3B8] text-base max-w-md mx-auto leading-relaxed">
          {t.empty.subtitle}
        </p>
      </div>

      {/* Input form */}
      <TaskForm
        t={t}
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        rows={5}
        textareaId="task-input-textarea"
      />

      {/* Example task chips */}
      <div className="mt-8">
        <p className="text-center text-xs text-[#94A3B8]/60 mb-3">
          {t.empty.exampleTasks}
        </p>
        {loadingChips ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-7 w-44 rounded-lg bg-[#1E293B]/60 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 justify-center">
            {chips.map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleExampleClick(example)}
                className="px-3 py-1.5 rounded-lg border border-[#334155] bg-[#1E293B]/40 text-[#94A3B8] text-xs hover:border-[#86EFAC]/40 hover:text-[#F8FAFC] hover:bg-[#334155]/50 transition-all duration-150 text-left"
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
