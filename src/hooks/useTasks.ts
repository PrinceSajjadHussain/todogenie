import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseUrl, supabaseKey } from "@/lib/supabaseClient";
import type { Task, TaskFilters, Subtask, Priority } from "@/types/todo";

const TASKS_KEY = (filters?: TaskFilters) => ["tasks", filters];

async function fetchTasks(filters?: TaskFilters): Promise<Task[]> {
  let query = supabase.from("tasks").select("*, subtasks(*), translations(*)").order("created_at", { ascending: false });

  if (filters?.q && filters.q.trim()) {
    // Simple ilike on title/description
    query = query.ilike("title", `%${filters.q}%`);
  }
  if (filters?.completed !== undefined && filters.completed !== "all") {
    query = query.eq("completed", filters.completed as boolean);
  }
  if (filters?.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority as Priority);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as Task[]) ?? [];
}

export function useTasks(filters?: TaskFilters) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: TASKS_KEY(filters), queryFn: () => fetchTasks(filters) });

  const createTask = useMutation({
    mutationFn: async (payload: { title: string; description?: string; due_date?: string | null; priority?: Priority | null }) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: payload.title,
          description: payload.description ?? null,
          due_date: payload.due_date ?? null,
          priority: payload.priority ?? null,
          completed: false,
        })
        .select("*")
        .single();
      if (error) throw error;

      // Trigger AI subtask generation (fire and forget)
      try {
        const functionBody = {
            taskId: data.id,
            title: data.title ?? null,
            description: data.description ?? null,
            priority: data.priority ?? null,
          };
        console.log("Invoking ai-generate-subtasks with body:", functionBody);
        const functionUrl = `${supabaseUrl}/functions/v1/ai-generate-subtasks`;
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
        };

        const response = await fetch(functionUrl, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(functionBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error invoking ai-generate-subtasks directly:", errorData);
          throw new Error(errorData.error || "Failed to generate subtasks");
        }
      } catch (_) {
        // non-blocking
      }

      return data as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY(filters) }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase.from("tasks").update(fields).eq("id", id).select("*").single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY(filters) }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY(filters) }),
  });

  const addSubtask = useMutation({
    mutationFn: async (payload: Omit<Subtask, "id" | "created_at">) => {
      const { data, error } = await supabase.from("subtasks").insert(payload).select("*").single();
      if (error) throw error;
      return data as Subtask;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY() }),
  });

  const updateSubtask = useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Subtask> & { id: string }) => {
      const { data, error } = await supabase.from("subtasks").update(fields).eq("id", id).select("*").single();
      if (error) throw error;
      return data as Subtask;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY() }),
  });

  const translateTask = useMutation({
    mutationFn: async (payload: { taskId: string; language: string }) => {
      console.log("Invoking ai-translate with body:", payload);

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase URL or Key is not configured.");
      }

      const functionUrl = `${supabaseUrl}/functions/v1/ai-translate`;
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`, // Use the anon key for client-side
        "apikey": supabaseKey, // Also include apikey header
      };

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Error invoking ai-translate directly:", data);
        throw new Error(data.error || "Translation failed");
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const regenerateSubtasks = useMutation({
    mutationFn: async (payload: { taskId: string }) => {
      const task = q.data?.find((t) => t.id === payload.taskId);
      const functionBody = {
          taskId: payload.taskId,
          title: task?.title ?? null,
          description: task?.description ?? null,
          priority: task?.priority ?? null,
          rerun: true,
        };
      console.log("Invoking ai-generate-subtasks (regenerate) with body:", functionBody);
      const functionUrl = `${supabaseUrl}/functions/v1/ai-generate-subtasks`;
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
      };

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(functionBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error invoking ai-generate-subtasks (regenerate) directly:", errorData);
        throw new Error(errorData.error || "Failed to regenerate subtasks");
      }
      return true;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  return { ...q, createTask, updateTask, deleteTask, addSubtask, updateSubtask, translateTask, regenerateSubtasks };
}
