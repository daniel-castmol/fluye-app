"use client";

import { useState } from "react";
import TaskForm from "@/components/app/TaskForm";
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

      <TaskForm
        t={t}
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        rows={6}
      />
    </div>
  );
}
