// @ts-nocheck
// Supabase Edge Function: ai-translate
// Requires GEMINI_API_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

interface Payload { taskId: string; language: string; }

Deno.serve(async (req) => {
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
  "Access-Control-Allow-Credentials": "true",  
  "Vary": "Origin",
};

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const translatePlainText = async (system: string, user: string, temperature = 0.1, maxTokens = 1024) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens },
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
        return "Translation failed due to API error.";
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return text.trim();
    } catch (e) {
      console.error("Failed to fetch translation:", e);
      return "Translation failed due to a network or other error.";
    }
  };

  try {
    console.log("ai-translate function invoked.");
    console.log("ai-translate: Request headers:", Object.fromEntries(req.headers.entries())); // Log all incoming headers

    if (!GEMINI_API_KEY) {
      console.error("CRITICAL: GEMINI_API_KEY secret not found in Supabase Edge Function settings.");
      return new Response(JSON.stringify({ error: "API key not configured on server" }), { status: 500, headers: corsHeaders });
    }

    // Safely parse the request body
    let payload: Payload;
    let rawBodyText: string;
    try {
      rawBodyText = await req.text();
      console.log("ai-translate: Raw request body text:", rawBodyText);
      if (!rawBodyText) {
        console.error("ai-translate: Request body was empty.");
        return new Response(JSON.stringify({ error: "Request body was empty. Expected JSON." }), { status: 400, headers: corsHeaders });
      }
      payload = JSON.parse(rawBodyText);
      console.log("ai-translate: Received payload:", payload);
    } catch (e) {
      console.error("ai-translate: Failed to parse request body as JSON:", e);
      return new Response(JSON.stringify({ error: "Invalid request body. Expected JSON." }), { status: 400, headers: corsHeaders });
    }

    const { taskId, language } = payload;
    if (!taskId || !language) return new Response(JSON.stringify({ error: "taskId and language are required" }), { status: 400, headers: corsHeaders });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: req.headers.get("Authorization")! } } });

    const { data: task, error: tErr } = await supabase.from("tasks").select("id, title, description").eq("id", taskId).single();
    if (tErr || !task) {
      console.error("ai-translate: Task not found or error fetching task:", tErr);
      return new Response(JSON.stringify({ error: "task_not_found" }), { status: 404, headers: corsHeaders });
    }

    const { data: subtasks, error: sErr } = await supabase.from("subtasks").select("id, title, description").eq("task_id", taskId);
    if (sErr) {
      console.error("ai-translate: Error fetching subtasks:", sErr);
      return new Response(JSON.stringify({ error: "subtasks_fetch_failed" }), { status: 500, headers: corsHeaders });
    }

    const { data: cached } = await supabase.from("translations").select("*").eq("task_id", taskId).eq("language", language).maybeSingle();
    if (cached) {
      console.log("ai-translate: Returning cached translation.");
      return new Response(JSON.stringify({ cached: true, translation: cached }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const dataToTranslate = {
      task: {
        title: task.title || "",
        description: task.description || "",
      },
      subtasks: subtasks.map((st: any) => ({
        id: st.id,
        title: st.title || "",
        description: st.description || "",
      })),
    };

    const system = `You are a highly accurate translation assistant. Your task is to translate the provided JSON object into the specified language. Translate all string values within the 'task' and 'subtasks' objects. Do not add any extra commentary, notes, or explanations—return only the translated JSON object. Ensure the output is valid JSON.`;
    const user = `Translate the following JSON into ${language}:\n\n${JSON.stringify(dataToTranslate, null, 2)}`;

    const translatedJsonString = await translatePlainText(system, user, 0.1, 2048); // Increased maxTokens for larger JSON

    let translatedData;
    try {
      translatedData = JSON.parse(translatedJsonString);
    } catch (e) {
      console.error("ai-translate: Failed to parse translated JSON:", e);
      return new Response(JSON.stringify({ error: "translation_parse_failed", raw_translation: translatedJsonString }), { status: 500, headers: corsHeaders });
    }

    const { data: saved, error } = await supabase.from("translations").insert({ task_id: taskId, language, translated_text: translatedData }).select("*").single();
    if (error) throw error;

    return new Response(JSON.stringify({ cached: false, translation: saved }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "translation_failed" }), { status: 500, headers: corsHeaders });
  }
});
