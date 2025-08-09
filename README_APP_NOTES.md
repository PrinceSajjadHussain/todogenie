AI To‑Do with Gemini (Supabase Edition)

Quick start
- Configure Supabase Edge Function secret GEMINI_API_KEY in your project (Project Settings → Functions → Secrets).
- Ensure migrations ran creating tables: tasks, subtasks, translations.
- Run locally: npm i && npm run dev

Edge functions
- ai-generate-subtasks: Calls Gemini 1.5 Pro with deterministic settings (temp=0.2) to generate 3–7 subtasks as strict JSON.
- ai-translate: Translates task title+description into a user-provided language. Caches per (task, language).

Notes
- Public demo policies allow anon CRUD. For production, add auth and restrict by user id.
- The UI uses React Query, shadcn, and Tailwind semantic tokens.
