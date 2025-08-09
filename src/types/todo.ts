export type Priority = "low" | "medium" | "high";

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  notes?: string | null;
  estimated_minutes: number;
  completed: boolean;
  created_at?: string;
}

export interface TranslatedSubtask {
  id: string;
  title: string;
  description?: string | null;
}

export interface TranslatedTaskData {
  task: {
    title: string;
    description?: string | null;
  };
  subtasks: TranslatedSubtask[];
}

export interface Translation {
  id: string;
  task_id: string;
  language: string;
  translated_text: TranslatedTaskData | string; // Can be string if parsing failed, but should be TranslatedTaskData
  created_at?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority?: Priority | null;
  due_date?: string | null;
  completed: boolean;
  created_at?: string;
  updated_at?: string;
  subtasks?: Subtask[];
  translations?: Translation[];
}

export interface TaskFilters {
  q?: string;
  completed?: boolean | "all";
  priority?: Priority | "all";
}
