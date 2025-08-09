import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Priority } from "@/types/todo";
import { useState } from "react";

interface FormValues {
  title: string;
  description?: string;
  due_date?: string;
  priority?: Priority;
}

export default function TaskForm({ onSubmit, loading }: { onSubmit: (data: FormValues) => void; loading?: boolean }) {
  const { register, handleSubmit, reset } = useForm<FormValues>();
  const [priority, setPriority] = useState<string | undefined>(undefined);

  return (
    <article className="bg-card border rounded-lg p-4 md:p-5 shadow-sm" aria-label="Add new task">
      <h2 className="text-lg font-semibold mb-3">Add Task</h2>
      <form
        onSubmit={handleSubmit((vals) => { onSubmit({ ...vals, priority: priority as Priority | undefined }); reset(); setPriority(undefined); })}
        className="grid gap-3 md:grid-cols-4"
      >
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Title</label>
          <Input placeholder="e.g., Prepare monthly report" {...register("title", { required: true })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Due date</label>
          <Input type="date" {...register("due_date")} />
        </div>
        <div>
          <label className="block text-sm mb-1">Priority</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-4">
          <label className="block text-sm mb-1">Description</label>
          <Textarea placeholder="Optional details..." {...register("description")} rows={3} />
        </div>
        <div className="md:col-span-4 flex gap-2 mt-2">
          <Button type="submit" disabled={loading}>Create & Generate Subtasks</Button>
          <p className="text-sm text-muted-foreground">AI will generate 3–7 subtasks automatically.</p>
        </div>
      </form>
    </article>
  );
}
