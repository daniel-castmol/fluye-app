"use client";

import { useState, useEffect, useCallback } from "react";
import type { Translations } from "@/lib/i18n";
import type { Task } from "@/types";
import ProjectCard from "./ProjectCard";
import CreateProjectModal from "./CreateProjectModal";
import { Flame, CheckCircle2, FolderOpen, Plus } from "lucide-react";

interface DashboardProject {
  id: string;
  name: string;
  emoji: string;
  color: string;
  taskCount: number;
  progress: number;
}

interface DashboardStats {
  tasksToday: number;
  activeProjects: number;
  streak: number;
}

interface DashboardProps {
  t: Translations;
  profileName: string;
  onProjectsChange: (projects: { id: string; name: string; emoji: string; color: string }[]) => void;
}

export default function Dashboard({ t, profileName, onProjectsChange }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({ tasksToday: 0, activeProjects: 0, streak: 0 });
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [recentActivity, setRecentActivity] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats);
      setProjects(data.projects);
      setRecentActivity(data.recentActivity);
      onProjectsChange(data.projects);
    } finally {
      setLoading(false);
    }
  }, [onProjectsChange]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleProjectCreated = (project: { id: string; name: string; emoji: string; color: string }) => {
    const newProject: DashboardProject = {
      ...project,
      taskCount: 0,
      progress: 0,
    };
    setProjects((prev) => [newProject, ...prev]);
    setStats((prev) => ({ ...prev, activeProjects: prev.activeProjects + 1 }));
    onProjectsChange([newProject, ...projects]);
  };

  const statCards = [
    { label: t.dashboard.tasksToday, value: stats.tasksToday, icon: CheckCircle2, color: "#86EFAC" },
    { label: t.dashboard.activeProjects, value: stats.activeProjects, icon: FolderOpen, color: "#93C5FD" },
    { label: t.dashboard.streak, value: `${stats.streak}d`, icon: Flame, color: "#F97316" },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-[#1E293B] rounded w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#1E293B] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-[#1E293B] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <h1 className="text-2xl font-bold text-[#F8FAFC]">
        {t.dashboard.greeting}, {profileName}
      </h1>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[#334155]/50 bg-[#1E293B]/30 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              <span className="text-xs text-[#94A3B8]">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#F8FAFC]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#F8FAFC]">{t.dashboard.yourProjects}</h2>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#86EFAC] hover:bg-[#86EFAC]/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.sidebar.newProject}
          </button>
        </div>

        {projects.length === 0 ? (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="w-full rounded-xl border border-dashed border-[#334155] p-8 text-center text-[#64748B] hover:border-[#86EFAC]/30 hover:text-[#94A3B8] transition-colors"
          >
            <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t.dashboard.noProjects}</p>
          </button>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} {...project} />
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">{t.dashboard.recentActivity}</h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-[#64748B]">{t.dashboard.noActivity}</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((task) => {
              const completed = task.steps.filter((s) => s.completed).length;
              const total = task.steps.length;
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-[#334155]/30 bg-[#1E293B]/20 px-4 py-3"
                >
                  {task.project && (
                    <span className="text-sm" title={task.project.name}>
                      {task.project.emoji}
                    </span>
                  )}
                  <span className="flex-1 text-sm text-[#F8FAFC] truncate">
                    {task.originalText}
                  </span>
                  <span className="text-xs text-[#94A3B8] shrink-0">
                    {completed}/{total}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateProjectModal
        t={t}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  );
}
