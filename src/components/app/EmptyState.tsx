"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const GHOST_TEXT_EN = [
  "I need to clean my apartment but I don't know where to start...",
  "Fix the bug in the checkout flow before the demo...",
  "Prepare the quarterly presentation for Friday...",
  "Set up the new development environment...",
  "Write the documentation for the API endpoints...",
];

const GHOST_TEXT_ES = [
  "Necesito limpiar el departamento pero no sé por dónde empezar...",
  "Arreglar el bug del checkout antes de la demo...",
  "Preparar la presentación trimestral para el viernes...",
  "Configurar el nuevo entorno de desarrollo...",
  "Escribir la documentación de los endpoints del API...",
];

interface EmptyStateProps {
  t: Translations;
  onSubmit: (input: string) => void;
  profileId: string;
  onCancel?: () => void;
  language?: string;
  /** Pre-fill textarea with a saved draft */
  initialDraft?: string;
}

export default function EmptyState({ t, onSubmit, profileId, onCancel, language, initialDraft }: EmptyStateProps) {
  const [input, setInput] = useState(initialDraft || "");
  const [chips, setChips] = useState<string[]>(t.empty.exampleList);
  const [loadingChips, setLoadingChips] = useState(false);
  const [ghostIndex, setGhostIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const ghostTexts = language === "es" ? GHOST_TEXT_ES : GHOST_TEXT_EN;

  // Rotate ghost text every 4 seconds
  useEffect(() => {
    if (input) return; // stop rotating when user starts typing
    const interval = setInterval(() => {
      setGhostIndex((prev) => (prev + 1) % ghostTexts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [input, ghostTexts.length]);

  useEffect(() => {
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
      // ignore parse errors
    }

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
      .catch(() => {})
      .finally(() => setLoadingChips(false));
  }, [profileId, language]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmit(input.trim());
  }

  function handleExampleClick(example: string) {
    setInput(example);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Cancel button */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mb-6 text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors duration-150"
        >
          {t.empty.cancelButton}
        </button>
      )}

      {/* Compact hero */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full border border-[#86EFAC]/20 bg-[#86EFAC]/5 text-[#86EFAC] text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-powered task breakdown</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-[#F8FAFC] mb-2 leading-tight tracking-tight">
          {t.empty.title}
        </h1>
        <p className="text-[#94A3B8] text-sm max-w-md mx-auto leading-relaxed">
          {t.empty.subtitle}
        </p>
      </div>

      {/* Focus Card */}
      <div className="focus-card rounded-2xl p-5 mb-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              id="task-input-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={ghostTexts[ghostIndex]}
              rows={4}
              maxLength={2000}
              className="w-full bg-transparent border-none text-[#F8FAFC] placeholder:text-[#94A3B8]/30 resize-none text-base leading-relaxed focus:outline-none focus:ring-0 placeholder:transition-opacity placeholder:duration-500 font-mono"
            />
            <span className="absolute bottom-1 right-1 text-[#94A3B8]/30 text-xs">
              {input.length}/2000
            </span>
          </div>

          <Button
            type="submit"
            disabled={!input.trim()}
            className="w-full h-12 bg-[#86EFAC] text-[#0F172A] font-bold text-base hover:bg-emerald-400 transition-all duration-300 rounded-xl disabled:opacity-30 disabled:animate-none animate-breathe"
          >
            {t.taskInput.button}
          </Button>
        </form>
      </div>

      {/* Example chips */}
      <div>
        <p className="text-center text-xs text-[#94A3B8]/50 mb-3">
          {t.empty.exampleTasks}
        </p>
        {loadingChips ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-7 w-40 rounded-lg bg-[#1E293B]/60 animate-pulse"
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
                className="px-3 py-1.5 rounded-lg border border-[#334155]/60 bg-[#1E293B]/30 text-[#94A3B8] text-xs hover:border-[#86EFAC]/30 hover:text-[#F8FAFC] hover:bg-[#334155]/40 transition-all duration-150 text-left"
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
