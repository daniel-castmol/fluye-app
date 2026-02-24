"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TaskInputProps {
  onSubmit: (input: string) => void;
}

export default function TaskInput({ onSubmit }: TaskInputProps) {
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmit(input.trim());
  }

  return (
    <div className="w-full">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-[#F8FAFC] mb-3">
          What do you need to do today?
        </h2>
        <p className="text-[#94A3B8] text-sm">
          Be vague if you want — I&apos;ll ask questions to help clarify.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"Fix segments dataset\nCreate PoP for business metrics\nStart Iceberg table"}
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
          Get Clarity →
        </Button>
      </form>
    </div>
  );
}
