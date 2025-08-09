import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import type { Task, Subtask, TaskFilters } from "@/types/todo";
import { toast } from "@/hooks/use-toast";

export default function TaskList({ filters }: { filters: TaskFilters }) {
  const { data, isLoading, error, updateTask, updateSubtask, addSubtask, translateTask, regenerateSubtasks } = useTasks(filters);
  const [openId, setOpenId] = useState<string | null>(null);

  if (error) return <div className="text-destructive">Failed to load tasks</div>;
  if (isLoading) return <div className="animate-pulse text-sm text-muted-foreground">Loading tasks…</div>;

  const openTask = data?.find((t) => t.id === openId) || null;

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data?.map((task) => (
        <TaskCard
          key={task.id}
          task={task as Task}
          onOpen={() => setOpenId(task.id)}
          onToggle={(checked) => updateTask.mutate({ id: task.id, completed: checked })}
        />
      ))}

      <TaskModal
        open={!!openId}
        onOpenChange={(v) => !v && setOpenId(null)}
        task={openTask as Task | null}
        onToggleTask={(checked) => openTask && updateTask.mutate({ id: openTask.id, completed: checked })}
        onUpdateSubtask={(sid, updates) => updateSubtask.mutate({ id: sid, ...updates })}
        onAddSubtask={(payload) => addSubtask.mutate(payload)}
        onTranslate={async (language) => {
          if (!openTask) return;
          const { id } = openTask;
          const p = toast({ title: "Translating…" });
          try { await translateTask.mutateAsync({ taskId: id, language }); p.update({ id: p.id, title: "Translation saved" }); } catch (e) { p.update({ id: p.id, title: "Translation failed" }); }
        }}
        onRegenerate={async () => {
          if (!openTask) return;
          const p = toast({ title: "Generating subtasks…" });
          try { await regenerateSubtasks.mutateAsync({ taskId: openTask.id }); p.update({ id: p.id, title: "Subtasks updated" }); } catch { p.update({ id: p.id, title: "Failed to generate subtasks" }); }
        }}
      />
    </section>
  );
}
