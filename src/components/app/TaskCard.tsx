import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CalendarDays, Languages, ListChecks, Sparkles, RotateCw } from "lucide-react";
import type { Task } from "@/types/todo";
import { useTasks } from "@/hooks/useTasks";
import { toast } from "@/hooks/use-toast";

export default function TaskCard({ task, onOpen, onToggle }: { task: Task; onOpen: () => void; onToggle: (checked: boolean) => void }) {
  const { regenerateSubtasks } = useTasks();
  const completedCount = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const total = task.subtasks?.length ?? 0;
  const progressText = total > 0 ? `${completedCount} / ${total}` : "No subtasks";

  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const p = toast({ title: "Regenerating subtasks…" });
    regenerateSubtasks.mutate({ taskId: task.id }, {
      onSuccess: () => p.update({ id: p.id, title: "Subtasks regenerated" }),
      onError: () => p.update({ id: p.id, title: "Failed to regenerate" }),
    });
  };

  return (
    <Card className="hover:shadow-lg transition-shadow w-full" role="article" aria-label={`Task: ${task.title}`}>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Checkbox checked={task.completed} onCheckedChange={(v) => onToggle(Boolean(v))} className="mt-1" aria-label="Toggle task completion" />
          <div className="flex-1">
            <CardTitle className={`leading-tight ${task.completed ? "text-muted-foreground line-through" : ""}`}>
              {task.title}
            </CardTitle>
            {task.description && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{task.description}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {task.priority && <Badge variant={task.priority === "high" ? "destructive" : "secondary"}>{task.priority}</Badge>}
          {task.due_date && (
            <Badge variant="outline" className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {new Date(task.due_date).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onOpen}>
              <Sparkles className="size-4 mr-1.5" />
              {total > 0 ? "View Details" : "Generate Subtasks"}
            </Button>
            {total > 0 && (
              <Button variant="outline" size="icon" onClick={handleRegenerate} disabled={regenerateSubtasks.isPending} aria-label="Regenerate subtasks">
                <RotateCw className={`size-4 ${regenerateSubtasks.isPending ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {task.translations && task.translations.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Languages className="size-4" />
                {task.translations.length} cached
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <ListChecks className="size-4" />
              {progressText}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
