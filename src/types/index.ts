export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  name: string;
  roleWork: string | null;
  projects: string | null;
  subscriptionStatus: string;
  taskBreakdownsToday: number;
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
  userId: string;
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
