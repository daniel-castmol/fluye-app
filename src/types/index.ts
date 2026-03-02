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
}

export interface Task {
  id: string;
  // profileId references UserProfile.id (NOT Supabase auth user ID)
  profileId: string;
  originalText: string;
  clarification: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  steps: TaskStep[];
}

export interface ClarifyResponse {
  questions: string[];
}

export interface BreakdownTask {
  original: string;
  context: string;
  steps: string[];
}

export interface BreakdownResponse {
  tasks: BreakdownTask[];
}
