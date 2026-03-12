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
