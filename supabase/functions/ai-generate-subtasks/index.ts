// @ts-nocheck
// Supabase Edge Function: ai-generate-subtasks
// Requires GEMINI_API_KEY secret configured in Supabase project
// Policy: tables must allow inserts from anon or use service role key

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

interface Payload {
  taskId: string;
  title?: string;
  description?: string | null;
  priority?: string | null;
  rerun?: boolean;
}

Deno.serve(async (req: Request) => {
 const allowedOrigins = [
  "http://localhost:8080",
  "https://todogenie-8aqo57vvh-princesajjadhussains-projects.vercel.app",
  "https://todogenie-git-main-princesajjadhussains-projects.vercel.app",
  "https://todogenie-five.vercel.app"
];

const origin = req.headers.get("Origin") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};


  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const generateStrictJsonArray = async (system: string, user: string, temperature = 0.2, maxTokens = 1024) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature,
              maxOutputTokens: maxTokens,
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            ],
          }),
        });

        if (!res.ok) {
          console.error(`Gemini API error: ${res.status} ${res.statusText}`, await res.text());
          continue;
        }

        const data = await res.json();
        const json = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("Gemini API response (raw JSON):", json);
        if (json) {
          const parsed = JSON.parse(json);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.error(`Attempt ${attempt + 1} failed:`, e);
      }
    }
    return [{ title: "Outline the work", notes: "Break down the task into steps", estimated_minutes: 30, completed: false }];
  };

  try {
    console.log("ai-generate-subtasks function invoked.");
    console.log("ai-generate-subtasks: Request headers:", Object.fromEntries(req.headers.entries()));

    if (!GEMINI_API_KEY) {
      console.error("CRITICAL: GEMINI_API_KEY secret not found in Supabase Edge Function settings.");
      return new Response(JSON.stringify({ error: "API key not configured on server" }), { status: 500, headers: corsHeaders });
    }

    // Safely parse the request body
    let body: Payload;
    let rawBodyText: string;
    try {
      rawBodyText = await req.text();
      console.log("ai-generate-subtasks: Raw request body text:", rawBodyText);
      if (!rawBodyText) {
        console.error("ai-generate-subtasks: Request body was empty.");
        return new Response(JSON.stringify({ error: "Request body was empty. Expected JSON." }), { status: 400, headers: corsHeaders });
      }
      body = JSON.parse(rawBodyText);
      console.log("ai-generate-subtasks: Received payload:", body);
    } catch (e) {
      console.error("ai-generate-subtasks: Failed to parse request body as JSON:", e);
      return new Response(JSON.stringify({ error: "Invalid request body. Expected JSON." }), { status: 400, headers: corsHeaders });
    }

    if (!body?.taskId) return new Response(JSON.stringify({ error: "taskId is required" }), { status: 400, headers: corsHeaders });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: req.headers.get("Authorization")! } } });

    let { title, description, priority } = body;
    if (!title) {
      const { data } = await supabase.from("tasks").select("title, description, priority").eq("id", body.taskId).single();
      title = data?.title;
      description = data?.description;
      priority = data?.priority;
    }

    // Ensure title is always a string, even if fetched as null/undefined
    const taskTitle = title || "Untitled Task";

    const system = "You are an expert project manager. Your role is to break down tasks into smaller, actionable subtasks. You must output a JSON array of subtask objects, and nothing else.";
    const user = `Based on the following task, generate between 3 and 7 subtasks.
Task details:
- Title: ${taskTitle}
- Description: ${description || "N/A"}
- Priority: ${priority || "Normal"}

Each subtask object in the JSON array must have the following keys:
- "title": A concise and clear title for the subtask.
- "notes": A brief description of the subtask.
- "estimated_minutes": An integer representing the estimated time in minutes to complete the subtask.
- "completed": A boolean, which should always be false initially.

Example output for a task about "Prepare quarterly report":
[
  { "title": "Gather sales data", "notes": "Export Q3 sales data from CRM.", "estimated_minutes": 45, "completed": false },
  { "title": "Analyze marketing spend", "notes": "Review ad campaign performance and costs.", "estimated_minutes": 60, "completed": false }
]

Now, generate the subtasks for the provided task.`;

    const subtasks = await generateStrictJsonArray(system, user, 0.2, 1024);

    if (!Array.isArray(subtasks)) throw new Error("AI did not return array");

    if (body.rerun) {
      // In rerun, we don't want to delete old subtasks, just append new ones.
    } else {
      // On initial creation, delete any existing subtasks to prevent duplicates from retries.
      await supabase.from("subtasks").delete().eq("task_id", body.taskId);
    }

    const rows = subtasks.slice(0, 7).map((s: any) => ({
      task_id: body.taskId,
      title: String(s.title ?? "Untitled"),
      notes: s.notes ? String(s.notes) : null,
      estimated_minutes: Number.isFinite(Number(s.estimated_minutes)) ? Number(s.estimated_minutes) : 30,
      completed: false,
    }));

    if (rows.length === 0) {
      rows.push({ task_id: body.taskId, title: "Outline the work", notes: "No subtasks generated, please check task details.", estimated_minutes: 30, completed: false });
    }

    const { error } = await supabase.from("subtasks").insert(rows);
    if (error) throw error;

    return new Response(JSON.stringify({ inserted: rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "generation_failed" }), { status: 500, headers: corsHeaders });
  }
});
