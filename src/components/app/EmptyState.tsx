"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import type { Translations } from "@/lib/i18n";

interface EmptyStateProps {
  t: Translations;
  onSubmit: (input: string) => void;
}

export default function EmptyState({ t, onSubmit }: EmptyStateProps) {
  const [input, setInput] = useState("");

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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Textarea
            id="task-input-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.taskInput.placeholder}
            rows={5}
            maxLength={2000}
            className="bg-[#1E293B]/50 border-[#334155] text-[#F8FAFC] placeholder:text-[#94A3B8]/40 resize-none text-base leading-relaxed rounded-xl focus:border-[#86EFAC]/50 focus:ring-[#86EFAC]/20"
          />
          <span className="absolute bottom-3 right-3 text-[#94A3B8]/40 text-xs">
            {input.length}/2000
          </span>
        </div>

        <Button
          type="submit"
          disabled={!input.trim()}
          className="w-full h-12 bg-[#86EFAC] text-[#0F172A] font-bold text-base hover:bg-emerald-400 transition-all duration-300 rounded-xl disabled:opacity-40"
        >
          {t.taskInput.button}
        </Button>
      </form>

      {/* Example task chips */}
      <div className="mt-8">
        <p className="text-center text-xs text-[#94A3B8]/60 mb-3">
          {t.empty.exampleTasks}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {t.empty.exampleList.map((example, i) => (
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
      </div>
    </div>
  );
}
