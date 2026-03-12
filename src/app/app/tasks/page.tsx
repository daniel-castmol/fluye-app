"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/components/app/AppContext";
import AppShell from "@/components/app/AppShell";

export default function TasksPage() {
  const { profile } = useApp();
  const [tasks, setTasks] = useState<import("@/types").Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/tasks?status=active");
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-[#1E293B] rounded w-48" />
        <div className="h-40 bg-[#1E293B] rounded-xl" />
      </div>
    );
  }

  return (
    <AppShell
      profile={profile}
      initialTasks={tasks}
    />
  );
}
