"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Translations } from "@/lib/i18n";

interface TaskFormProps {
  t: Translations;
  /** Controlled input value */
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  /** Number of visible textarea rows (default: 5) */
  rows?: number;
  /** Optional id for the textarea element (e.g. for external focus) */
  textareaId?: string;
}

/**
 * Shared task-input form: textarea with char counter + submit button.
 * Used by both TaskInput and EmptyState — keep in sync with their props.
 */
export default function TaskForm({
  t,
  value,
  onChange,
  onSubmit,
  rows = 5,
  textareaId,
}: TaskFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="relative">
        <Textarea
          id={textareaId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t.taskInput.placeholder}
          rows={rows}
          maxLength={2000}
          className="bg-[#1E293B]/50 border-[#334155] text-[#F8FAFC] placeholder:text-[#94A3B8]/40 resize-none text-base leading-relaxed rounded-xl focus:border-[#86EFAC]/50 focus:ring-[#86EFAC]/20"
        />
        <span className="absolute bottom-3 right-3 text-[#94A3B8]/40 text-xs">
          {value.length}/2000
        </span>
      </div>

      <Button
        type="submit"
        disabled={!value.trim()}
        className="w-full h-12 bg-[#86EFAC] text-[#0F172A] font-bold text-base hover:bg-emerald-400 transition-all duration-300 rounded-xl disabled:opacity-40"
      >
        {t.taskInput.button}
      </Button>
    </form>
  );
}
