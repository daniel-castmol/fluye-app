"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Translations } from "@/lib/i18n";

interface TaskInputProps {
  t: Translations;
  onSubmit: (input: string) => void;
  /** Pre-fill the input (e.g. example tasks) */
  initialValue?: string;
}

export default function TaskInput({ t, onSubmit, initialValue = "" }: TaskInputProps) {
  const [input, setInput] = useState(initialValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmit(input.trim());
  }

  return (
    <div className="w-full">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-[#F8FAFC] mb-3">
          {t.taskInput.title}
        </h2>
        <p className="text-[#94A3B8] text-sm">{t.taskInput.tip}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.taskInput.placeholder}
            rows={6}
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
    </div>
  );
}
