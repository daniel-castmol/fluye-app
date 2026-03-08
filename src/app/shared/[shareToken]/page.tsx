import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SharedTaskView from "./SharedTaskView";

interface SharedPageProps {
  params: Promise<{ shareToken: string }>;
}

export async function generateMetadata({
  params,
}: SharedPageProps): Promise<Metadata> {
  const { shareToken } = await params;

  const task = await prisma.task.findUnique({
    where: { shareToken },
    select: { originalText: true },
  });

  if (!task) {
    return { title: "Task not found — Fluye" };
  }

  return {
    title: `${task.originalText} — Fluye`,
    description: `See how Fluye broke down "${task.originalText}" into concrete steps.`,
  };
}

export default async function SharedPage({ params }: SharedPageProps) {
  const { shareToken } = await params;

  const task = await prisma.task.findUnique({
    where: { shareToken },
    include: {
      steps: { orderBy: { order: "asc" } },
      profile: { select: { name: true } },
    },
  });

  if (!task || !task.isShared) {
    notFound();
  }

  return (
    <SharedTaskView
      task={JSON.parse(JSON.stringify(task))}
      ownerName={task.profile.name}
    />
  );
}
