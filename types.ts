export enum TaskType {
  DAILY = 'DAILY',
  LONG_TERM = 'LONG_TERM'
}

export enum DurationUnit {
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface Duration {
  value: number;
  unit: DurationUnit;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  completed: boolean;
  createdAt: number;
  duration: Duration;
  priority: Priority;
  dueDate?: number;
  subtasks?: { id: string; title: string; completed: boolean }[];
}

export interface UserProfile {
  name: string;
  avatarUrl?: string; // We'll just use a placeholder or emoji
  onboarded: boolean;
}

export type ViewState = 'HOME' | 'ADD_TASK' | 'PROFILE' | 'EDIT_TASK';