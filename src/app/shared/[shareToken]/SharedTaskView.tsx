"use client";

import type { Task } from "@/types";
import { CheckCircle2, Circle, Clock, Sparkles } from "lucide-react";
import Link from "next/link";

interface SharedTaskViewProps {
  task: Task & { profile?: { name: string } };
  ownerName: string;
}

export default function SharedTaskView({ task, ownerName }: SharedTaskViewProps) {
  const completedCount = task.steps.filter((s) => s.completed).length;
  const totalSteps = task.steps.length;
  const progress = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC]">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-[#F8FAFC] text-xl font-bold tracking-tighter hover:opacity-80 transition-opacity"
          >
            Fluye.
          </Link>
        </div>

        {/* Task card */}
        <div className="rounded-xl border border-[#334155] bg-[#1E293B]/30 p-6 sm:p-8">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#86EFAC]" />
            <span className="text-xs text-[#94A3B8]">
              Broken down with Fluye by {ownerName}
            </span>
          </div>

          {/* Task title */}
          <h1 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] mb-4">
            {task.originalText}
          </h1>

          {/* Progress */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-1.5 bg-[#334155]/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#86EFAC] to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-[#94A3B8] shrink-0">
              {completedCount}/{totalSteps} steps
            </span>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {task.steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  step.completed ? "bg-[#86EFAC]/5" : ""
                }`}
              >
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-[#86EFAC] shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-[#334155] shrink-0 mt-0.5" />
                )}
                <div className="flex flex-col gap-1">
                  <span
                    className={`text-sm leading-relaxed ${
                      step.completed
                        ? "text-[#94A3B8] line-through"
                        : "text-[#F8FAFC]"
                    }`}
                  >
                    {step.text}
                  </span>
                  {step.durationEstimate && !step.completed && (
                    <span className="inline-flex items-center w-fit gap-1 px-1.5 py-0.5 rounded-md bg-[#334155]/40 text-[#86EFAC] text-[10px] font-medium border border-[#86EFAC]/10">
                      <Clock className="w-2.5 h-2.5" />
                      {step.durationEstimate}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#86EFAC] text-[#0F172A] font-semibold text-sm hover:bg-[#86EFAC]/90 transition-colors"
          >
            Kill the paralysis. Try Fluye free
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
