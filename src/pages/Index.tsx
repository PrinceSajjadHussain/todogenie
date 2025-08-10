import { useState } from "react";
import SearchFilterBar from "@/components/app/SearchFilterBar";
import TaskForm from "@/components/app/TaskForm";
import TaskList from "@/components/app/TaskList";
import { useTasks } from "@/hooks/useTasks";
import type { TaskFilters, Priority } from "@/types/todo";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import TaskModal from "@/components/app/TaskModal";

const Index = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({ completed: "all", priority: "all", q: "" });
  const { createTask } = useTasks(filters);

  return (
    <main className="min-h-screen bg-[var(--gradient-surface)]">
      <header className="container py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
            TodoGenie
          </h1>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2">
                <Sparkles className="w-4 h-4" />
                New Task
              </Button>
            </DialogTrigger>
            <TaskModal open={isModalOpen} onOpenChange={setIsModalOpen} onClose={() => setIsModalOpen(false)} />
          </Dialog>
        </div>
        <p className="mt-2 text-muted-foreground max-w-2xl">Create tasks, let AI generate actionable subtasks, and translate into any language. Fast, accessible, and persistent with Supabase.</p>
      </header>

      <section className="container space-y-6 pb-16">
        <SearchFilterBar value={filters} onChange={setFilters} />

        <TaskForm
          onSubmit={(vals) => {
            const p = toast({ title: "Creating task…" });
            createTask.mutate({ title: vals.title, description: vals.description, due_date: vals.due_date || null, priority: vals.priority || null }, {
              onSuccess: () => p.update({ id: p.id, title: "Task created — generating subtasks" }),
              onError: () => p.update({ id: p.id, title: "Failed to create task" }),
            });
          }}
          loading={createTask.isPending}
        />

        <TaskList filters={filters} />

        <footer className="text-center text-xs text-muted-foreground pt-6">
          Built with Supabase Edge Functions + Google Gemini. Translations cached per language. Subtasks generated deterministically.
        </footer>
      </section>
    </main>
  );
};

export default Index;
