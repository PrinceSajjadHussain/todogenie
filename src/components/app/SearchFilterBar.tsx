import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { TaskFilters } from "@/types/todo";
import { FilterIcon } from "lucide-react";

interface Props {
  value: TaskFilters;
  onChange: (f: TaskFilters) => void;
}

export default function SearchFilterBar({ value, onChange }: Props) {
  const [q, setQ] = useState(value.q ?? "");
  return (
    <section className="w-full bg-card border rounded-lg p-4 md:p-5 shadow-sm" aria-label="Task filters">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Search</label>
          <Input
            placeholder="Search tasks..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onChange({ ...value, q })}
            aria-label="Search tasks"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Completion</label>
          <Select value={String(value.completed ?? "all")} onValueChange={(v) => onChange({ ...value, completed: v === "all" ? "all" : v === "true" })}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Completed</SelectItem>
              <SelectItem value="false">Active</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Priority</label>
          <Select value={(value.priority ?? "all") as string} onValueChange={(v) => onChange({ ...value, priority: v as any })}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" onClick={() => onChange({ q, completed: value.completed ?? "all", priority: value.priority ?? "all" })}>
          <FilterIcon className="size-4 mr-2" />Apply
        </Button>
        <Button variant="ghost" onClick={() => { setQ(""); onChange({ q: "", completed: "all", priority: "all" }); }}>Reset</Button>
      </div>
    </section>
  );
}
