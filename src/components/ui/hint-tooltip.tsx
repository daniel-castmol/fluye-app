"use client";

// HintTooltip — Reusable contextual help tooltip
// Shows a small (?) icon that reveals helpful text on hover/tap.
// Used throughout the app to explain features to new users.

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface HintTooltipProps {
  text: string;       // The help text to display
  className?: string; // Optional extra classes
}

export function HintTooltip({ text, className }: HintTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center p-0.5 rounded-full text-[#64748B] hover:text-[#94A3B8] transition-colors ${className || ""}`}
            aria-label="Help"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[220px] bg-[#1E293B] border-[#334155] text-[#F8FAFC] text-xs"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
