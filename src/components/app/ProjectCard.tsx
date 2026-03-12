"use client";

import Link from "next/link";

interface ProjectCardProps {
  id: string;
  name: string;
  emoji: string;
  color: string;
  taskCount: number;
  progress: number;
}

export default function ProjectCard({
  id,
  name,
  emoji,
  color,
  taskCount,
  progress,
}: ProjectCardProps) {
  return (
    <Link
      href={`/app/projects/${id}`}
      className="group block rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02] bg-[#1E293B]/30 hover:bg-[#1E293B]/50"
      style={{ borderColor: `${color}30` }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{emoji}</span>
        <span className="text-xs text-[#94A3B8]">
          {taskCount} {taskCount === 1 ? "task" : "tasks"}
        </span>
      </div>
      <h3 className="text-[#F8FAFC] font-semibold text-sm mb-2 truncate">{name}</h3>
      <div className="w-full h-1 bg-[#334155]/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </div>
    </Link>
  );
}
