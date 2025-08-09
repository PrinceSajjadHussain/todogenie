// @ts-nocheck
// Supabase Edge Function: ai-translate
// Requires GEMINI_API_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

interface Payload { taskId: string; language: string; }

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://todogenie-five.vercel.app/", // Explicitly set the origin
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin", // Add Vary header
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

    const { data: cached } = await supabase.from("translations").select("*").eq("task_id", taskId).eq("language", language).maybeSingle();
    if (cached) {
      console.log("ai-translate: Returning cached translation.");
      return new Response(JSON.stringify({ cached: true, translation: cached }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure title and description are strings for translation
    const taskTitle = task.title || "";
    const taskDescription = task.description || "";
    const textToTranslate = `${taskTitle}${taskDescription ? `\n\n${taskDescription}` : ""}`;

    const system = "You are a highly accurate translation assistant. Your task is to translate the given text into the specified language. Do not add any extra commentary, notes, or explanations—return only the translated text.";
    const user = `Translate the following text into ${language}:\n\n${textToTranslate}`;

    const translated = await translatePlainText(system, user, 0.1, 1024);

    const { data: saved, error } = await supabase.from("translations").insert({ task_id: taskId, language, translated_text: translated }).select("*").single();
    if (error) throw error;

    return new Response(JSON.stringify({ cached: false, translation: saved }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "translation_failed" }), { status: 500, headers: corsHeaders });
  }
});
