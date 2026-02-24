"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle } from "lucide-react";

interface ClarificationChatProps {
  questions: string[];
  onSubmit: (answers: string[]) => void;
  onSkip: () => void;
}

export default function ClarificationChat({
  questions,
  onSubmit,
  onSkip,
}: ClarificationChatProps) {
  const [answers, setAnswers] = useState<string[]>(
    new Array(questions.length).fill("")
  );

  function updateAnswer(index: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(answers);
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-full bg-[#86EFAC]/10 border border-[#86EFAC]/20 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-[#86EFAC]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#F8FAFC]">
            I need a bit more context
          </h2>
          <p className="text-[#94A3B8] text-xs">
            Answer what you can — skip the rest
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {questions.map((question, index) => (
          <div
            key={index}
            className="rounded-xl border border-[#334155] bg-[#1E293B]/30 p-5"
          >
            <p className="text-[#F8FAFC] text-sm font-medium mb-3">
              {index + 1}. {question}
            </p>
            <Input
              value={answers[index]}
              onChange={(e) => updateAnswer(index, e.target.value)}
              placeholder="Type your answer..."
              className="bg-[#0F172A] border-[#334155] text-[#F8FAFC] placeholder:text-[#94A3B8]/40"
            />
          </div>
        ))}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            className="flex-1 h-12 border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50 rounded-xl"
          >
            Skip
          </Button>
          <Button
            type="submit"
            className="flex-[2] h-12 bg-[#86EFAC] text-[#0F172A] font-bold hover:bg-emerald-400 transition-all duration-300 rounded-xl"
          >
            Break It Down →
          </Button>
        </div>
      </form>
    </div>
  );
}
