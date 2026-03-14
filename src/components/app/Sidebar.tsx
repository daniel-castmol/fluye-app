"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Translations } from "@/lib/i18n";
import {
  LayoutDashboard,
  Zap,
  CalendarCheck,
  Plus,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

interface SidebarProject {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

interface SidebarProps {
  t: Translations;
  projects: SidebarProject[];
  onNewProject: () => void;
}

export default function Sidebar({ t, projects, onNewProject }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    {
      href: "/app/dashboard",
      label: t.sidebar.dashboard,
      icon: LayoutDashboard,
      active: pathname === "/app/dashboard",
    },
    {
      href: "/app/tasks",
      label: t.sidebar.quickTask,
      icon: Zap,
      active: pathname === "/app/tasks",
    },
    {
      href: "/app/planner",
      label: t.sidebar.planner,
      icon: CalendarCheck,
      active: pathname === "/app/planner",
    },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="fixed top-4 left-4 z-[60] p-2 rounded-lg bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors lg:hidden"
        aria-label="Toggle sidebar"
      >
        {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
      </button>

      {/* Backdrop on mobile */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-[#0F172A] border-r border-[#334155]/50 transition-all duration-200 flex flex-col",
          collapsed ? "-translate-x-full lg:translate-x-0 lg:w-16" : "w-64",
          "lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-4 border-b border-[#334155]/50">
          <Link href="/app/dashboard" className="text-[#F8FAFC] text-xl font-bold tracking-tighter">
            {collapsed ? "F." : "Fluye."}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="ml-auto hidden lg:block p-1 rounded text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (window.innerWidth < 1024) setCollapsed(true);
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                item.active
                  ? "bg-[#334155] text-[#F8FAFC]"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}

          {/* Projects section */}
          {!collapsed && (
            <div className="pt-4">
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  {t.sidebar.projects}
                </span>
                <button
                  type="button"
                  onClick={onNewProject}
                  className="p-0.5 rounded text-[#64748B] hover:text-[#86EFAC] transition-colors"
                  title={t.sidebar.newProject}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-0.5">
                {projects.map((project) => {
                  const isActive = pathname === `/app/projects/${project.id}`;
                  return (
                    <Link
                      key={project.id}
                      href={`/app/projects/${project.id}`}
                      onClick={() => {
                        if (window.innerWidth < 1024) setCollapsed(true);
                      }}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                        isActive
                          ? "bg-[#334155] text-[#F8FAFC]"
                          : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]"
                      )}
                    >
                      <span className="text-base leading-none">{project.emoji}</span>
                      <span className="truncate">{project.name}</span>
                      <div
                        className="w-2 h-2 rounded-full shrink-0 ml-auto"
                        style={{ backgroundColor: project.color }}
                      />
                    </Link>
                  );
                })}
                {projects.length === 0 && (
                  <button
                    type="button"
                    onClick={onNewProject}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#64748B] hover:text-[#86EFAC] transition-colors w-full"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.dashboard.createFirst}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Collapsed projects as dots */}
          {collapsed && projects.length > 0 && (
            <div className="pt-4 flex flex-col items-center gap-2">
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  href={`/app/projects/${project.id}`}
                  title={`${project.emoji} ${project.name}`}
                  className="text-base leading-none hover:scale-125 transition-transform"
                >
                  {project.emoji}
                </Link>
              ))}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
