export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  name: string;
  roleWork: string | null;
  projects: string | null;
  preferredLanguage: string;
  subscriptionStatus: string;
  taskBreakdownsToday: number;
  clarifyRequestsToday: number;
  totalTasksCompleted: number;
  currentStreak: number;
  lastCompletionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStep {
  id: string;
  taskId: string;
  text: string;
  order: number;
  completed: boolean;
  completedAt: string | null;
  durationEstimate: string | null;
  userEditedText: string | null;
}

export interface Project {
  id: string;
  profileId: string;
  name: string;
  emoji: string;
  color: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
  tasks?: Task[];
}

export interface Task {
  id: string;
  // profileId references UserProfile.id (NOT Supabase auth user ID)
  profileId: string;
  projectId: string | null;
  project?: Pick<Project, "id" | "name" | "emoji" | "color"> | null;
  originalText: string;
  clarification: string | null;
  status: string;
  shareToken: string | null;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  steps: TaskStep[];
}

export interface ClarifyResponse {
  questions: string[];
}

export interface BreakdownTaskStep {
  text: string;
  duration_estimate: string;
}

export interface BreakdownTask {
  original: string;
  context: string;
  steps: BreakdownTaskStep[];
}

export interface BreakdownResponse {
  tasks: BreakdownTask[];
}

// Day Planner — one plan per user per day
export interface DayPlan {
  id: string;
  profileId: string;
  date: string;
  dailyWin: string | null;
  reflection: string | null;
  mood: number | null;
  createdAt: string;
  updatedAt: string;
  steps: DayPlanStepWithDetails[];
}

// A single step assigned to a day plan
export interface DayPlanStep {
  id: string;
  dayPlanId: string;
  taskStepId: string;
  sortOrder: number;
  timeSpentSeconds: number;
  timerStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// DayPlanStep with nested task/project info for rendering
export interface DayPlanStepWithDetails extends DayPlanStep {
  taskStep: TaskStep & {
    task: Pick<Task, "id" | "originalText" | "projectId"> & {
      project: Pick<Project, "id" | "name" | "emoji" | "color"> | null;
    };
  };
}

// Step available to be added to a day plan (from incomplete tasks)
export interface AvailableStep {
  id: string;
  text: string;
  userEditedText: string | null;
  order: number;
  durationEstimate: string | null;
  completed: boolean;
  taskId: string;
  taskName: string;
  projectId: string | null;
  project: Pick<Project, "id" | "name" | "emoji" | "color"> | null;
  fromYesterday: boolean;
}
