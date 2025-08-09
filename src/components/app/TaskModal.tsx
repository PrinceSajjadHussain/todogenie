import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { Task, Subtask } from "@/types/todo";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { Languages, ListChecks, Sparkles, Trash2, Plus, RotateCw } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task | null;
}

// Helper function to safely parse translation data
const parseTranslationData = (translatedText: any, originalTask?: Task) => {
  // If it's already an object (new format), return it directly
  if (typeof translatedText === 'object' && translatedText !== null) {
    // Validate it has the expected structure
    if (translatedText.task && Array.isArray(translatedText.subtasks)) {
      return translatedText;
    }
  }

  // If it's a string, try to parse as JSON first
  if (typeof translatedText === 'string') {
    try {
      const parsed = JSON.parse(translatedText);
      // Validate the parsed object has the expected structure
      if (parsed && typeof parsed === 'object' && parsed.task && Array.isArray(parsed.subtasks)) {
        return parsed;
      }
    } catch (error) {
      console.warn('Translation is not valid JSON, treating as plain text:', error);
      
      // Create structured data from plain text
      const plainText = translatedText.trim();
      
      // Try to split by newlines to extract title and description
      const lines = plainText.split('\n').filter(line => line.trim());
      const title = lines[0] || plainText;
      const description = lines.slice(1).join('\n').trim();

      return {
        task: {
          title: title,
          description: description
        },
        subtasks: originalTask?.subtasks?.map(st => ({
          id: st.id,
          title: st.title, // Use original titles for subtasks when we only have plain text
          description: st.notes || st.description || ''
        })) || []
      };
    }
  }

  // Fallback: return null if we can't parse anything
  console.error('Could not parse translation data:', translatedText);
  return null;
};

export default function TaskModal({ open, onOpenChange, task }: Props) {
  const [lang, setLang] = useState("");
  const [newSubtask, setNewSubtask] = useState({ title: "", notes: "" });
  const [activeTranslation, setActiveTranslation] = useState<string | null>(null);
  const { updateTask, updateSubtask, addSubtask, translateTask, regenerateSubtasks } = useTasks();

  const translation = useMemo(() => {
    if (!activeTranslation) return null;
    return task?.translations?.find(t => t.language === activeTranslation) ?? null;
  }, [activeTranslation, task?.translations]);

  const parsedTranslationData = useMemo(() => {
    if (!translation || !translation.translated_text) return null;
    
    return parseTranslationData(translation.translated_text, task);
  }, [translation, task]);

  if (!task) return null;

  // Log the task object and its subtasks when the modal opens
  console.log("TaskModal opened for task:", task.id, task.title);
  console.log("Subtasks in TaskModal:", task.subtasks);

  const handleAddSubtask = () => {
    if (!newSubtask.title) return toast({ title: "Subtask title is required", variant: "destructive" });
    addSubtask.mutate(
      { task_id: task.id, title: newSubtask.title, notes: newSubtask.notes, estimated_minutes: 30, completed: false },
      { onSuccess: () => setNewSubtask({ title: "", notes: "" }) }
    );
  };

  const handleTranslate = async () => {
    if (!lang.trim()) return;
    const p = toast({ title: "Translating…" });
    translateTask.mutate({ taskId: task.id, language: lang.trim() }, {
      onSuccess: () => {
        p.update({ id: p.id, title: "Translation complete" });
        setActiveTranslation(lang.trim());
        setLang("");
      },
      onError: () => p.update({ id: p.id, title: "Translation failed", variant: "destructive" }),
    });
  };

  const handleRegenerate = () => {
    const p = toast({ title: "Regenerating subtasks…" });
    regenerateSubtasks.mutate({ taskId: task.id }, {
      onSuccess: () => p.update({ id: p.id, title: "Subtasks regenerated" }),
      onError: () => p.update({ id: p.id, title: "Failed to regenerate", variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Checkbox checked={task.completed} onCheckedChange={(v) => updateTask.mutate({ id: task.id, completed: Boolean(v) })} aria-label="Toggle task completion" />
            <span className={task.completed ? "line-through text-muted-foreground" : ""}>{task.title}</span>
            {task.priority && <Badge variant={task.priority === "high" ? "destructive" : "secondary"}>{task.priority}</Badge>}
          </DialogTitle>
          <DialogDescription>{task.description || "No description provided."}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-4">
          <section>
            <h4 className="font-semibold text-lg mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="size-5" /> Subtasks
              </div>
              <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerateSubtasks.isPending}>
                <RotateCw className={`size-4 mr-1.5 ${regenerateSubtasks.isPending ? "animate-spin" : ""}`} /> Regenerate
              </Button>
            </h4>
            <div className="space-y-2">
              {task.subtasks?.map((s) => (
                <div key={s.id} className="flex items-start gap-3 p-2.5 rounded-lg border bg-background">
                  <Checkbox className="mt-1" checked={s.completed} onCheckedChange={(v) => updateSubtask.mutate({ id: s.id, completed: Boolean(v) })} />
                  <div className="flex-1">
                    <p className={`font-medium ${s.completed ? "line-through text-muted-foreground" : ""}`}>{s.title}</p>
                    {s.notes && <p className="text-sm text-muted-foreground">{s.notes}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs">{s.estimated_minutes} min</Badge>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2">
                <Input placeholder="New subtask title..." value={newSubtask.title} onChange={(e) => setNewSubtask(s => ({ ...s, title: e.target.value }))} />
                <Input placeholder="Notes (optional)" value={newSubtask.notes} onChange={(e) => setNewSubtask(s => ({ ...s, notes: e.target.value }))} />
                <Button size="icon" onClick={handleAddSubtask} disabled={addSubtask.isPending}><Plus className="size-4" /></Button>
              </div>
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2"><Languages className="size-5" /> Translations</h4>
            <div className="flex items-center gap-2 mb-3">
              <Input placeholder="e.g., Spanish, Urdu, Japanese" value={lang} onChange={(e) => setLang(e.target.value)} />
              <Button onClick={handleTranslate} disabled={translateTask.isPending}>
                <Sparkles className="size-4 mr-1.5" /> {translateTask.isPending ? "Translating..." : "Translate"}
              </Button>
            </div>
            {task.translations && task.translations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {task.translations.map(t => (
                    <Button key={t.id} variant={activeTranslation === t.language ? "secondary" : "outline"} size="sm" onClick={() => setActiveTranslation(t.language)}>
                      {t.language}
                    </Button>
                  ))}
                </div>
                {parsedTranslationData && (
                  <div className="p-4 rounded-lg bg-muted border">
                    <h5 className="font-semibold text-md">{translation?.language} Translation</h5>
                    {parsedTranslationData?.task && (
                      <>
                        <p className="mt-2 font-medium">{parsedTranslationData.task.title}</p>
                        {parsedTranslationData.task.description && (
                          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{parsedTranslationData.task.description}</p>
                        )}
                      </>
                    )}
                    {parsedTranslationData?.subtasks && parsedTranslationData.subtasks.length > 0 && (
                      <div className="mt-4">
                        <h6 className="font-semibold text-sm mb-2">Translated Subtasks:</h6>
                        {parsedTranslationData.subtasks.map((s: any) => (
                          <div key={s.id} className="mb-2">
                            <p className="font-normal text-sm">{s.title}</p>
                            {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!parsedTranslationData && translation && (
                  <div className="p-4 rounded-lg bg-muted border">
                    <h5 className="font-semibold text-md">{translation.language} Translation</h5>
                    <p className="mt-2 text-sm text-muted-foreground">Unable to parse translation data. Please try translating again.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}