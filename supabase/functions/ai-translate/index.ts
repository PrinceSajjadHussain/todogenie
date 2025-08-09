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
      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      
      return text.trim();
    } catch (e) {
      console.error("Failed to fetch translation:", e);
      return "Translation failed due to a network or other error.";
    }
  };

  // Helper function to ensure we always have a valid JSON structure
  const ensureValidTranslationStructure = (translatedData: any, originalTask: any, originalSubtasks: any[]) => {
    // If translatedData is already a valid object with the expected structure, return it
    if (translatedData && typeof translatedData === 'object' && translatedData.task && Array.isArray(translatedData.subtasks)) {
      return translatedData;
    }

    // Otherwise, create a fallback structure
    console.log("Creating fallback structure for invalid translation data:", translatedData);
    
    // If translatedData is a string, try to extract meaningful content
    let fallbackTitle = "";
    let fallbackDescription = "";
    
    if (typeof translatedData === 'string') {
      // Split by newlines and use first line as title, rest as description
      const lines = translatedData.split('\n').filter(line => line.trim());
      fallbackTitle = lines[0] || originalTask.title || "";
      fallbackDescription = lines.slice(1).join('\n').trim() || "";
    } else {
      // Use original data as fallback
      fallbackTitle = originalTask.title || "";
      fallbackDescription = originalTask.description || "";
    }

    return {
      task: {
        title: fallbackTitle,
        description: fallbackDescription,
      },
      subtasks: originalSubtasks.map(st => ({
        id: st.id,
        title: st.title || "",
        description: st.description || "",
      })),
    };
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

    // Enhanced system prompt with more explicit JSON formatting instructions
    const system = `You are a highly accurate translation assistant. Your task is to translate the provided JSON object into the specified language.

CRITICAL INSTRUCTIONS:
1. Translate all string values within the 'task' and 'subtasks' objects
2. Maintain the EXACT same JSON structure as the input
3. Return ONLY a valid JSON object - no additional text, explanations, or markdown
4. Do NOT wrap the JSON in code blocks or backticks
5. Ensure all property names remain in English (task, subtasks, id, title, description)
6. Only translate the VALUES, not the property names

Example input structure:
{
  "task": {
    "title": "English title",
    "description": "English description"
  },
  "subtasks": [
    {
      "id": "uuid",
      "title": "English subtask title",
      "description": "English subtask description"
    }
  ]
}

Your response must follow this exact structure with translated values.`;

    const user = `Translate the following JSON into ${language}:\n\n${JSON.stringify(dataToTranslate, null, 2)}`;

    const rawTranslatedText = await translatePlainText(system, user, 0.1, 2048);
    console.log("ai-translate: Raw translated text from AI:", rawTranslatedText);

    let translatedData;
    try {
      // First attempt: Direct JSON parse
      translatedData = JSON.parse(rawTranslatedText);
      console.log("ai-translate: Successfully parsed JSON directly from AI response.");
    } catch (e) {
      console.warn("ai-translate: Direct JSON parse failed. Attempting markdown extraction.", e);
      
      // Second attempt: Extract from markdown code block
      const jsonMatch = rawTranslatedText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          translatedData = JSON.parse(jsonMatch[1]);
          console.log("ai-translate: Successfully parsed JSON from markdown block.");
        } catch (innerError) {
          console.error("ai-translate: Failed to parse extracted markdown JSON.", innerError);
          translatedData = null; // Will trigger fallback below
        }
      } else {
        console.warn("ai-translate: No markdown JSON block found.");
        translatedData = null; // Will trigger fallback below
      }
    }

    // Ensure we always have a valid structure before saving to database
    const finalTranslatedData = ensureValidTranslationStructure(translatedData, task, subtasks || []);
    console.log("ai-translate: Final structured translated data:", JSON.stringify(finalTranslatedData, null, 2));

    // Save to database with guaranteed valid JSON structure
    const { data: saved, error } = await supabase
      .from("translations")
      .insert({ 
        task_id: taskId, 
        language, 
        translated_text: finalTranslatedData 
      })
      .select("*")
      .single();

    if (error) {
      console.error("ai-translate: Error saving translation to DB:", error);
      throw error;
    }
    
    console.log("ai-translate: Successfully saved translation to DB:", saved);

    return new Response(JSON.stringify({ cached: false, translation: saved }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
    
  } catch (e) {
    console.error("ai-translate: Unhandled error:", e);
    return new Response(JSON.stringify({ error: "translation_failed" }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});