"use client";

import { use } from "react";
import { useApp } from "@/components/app/AppContext";
import ProjectDetailView from "@/components/app/ProjectDetailView";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, language, profile } = useApp();

  return (
    <ProjectDetailView
      t={t}
      projectId={id}
      language={language}
      profileId={profile.id}
    />
  );
}
