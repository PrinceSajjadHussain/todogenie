import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
export const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const missingMsg =
  "Supabase is not configured. Please connect your Lovable project to Supabase (green Supabase button) or set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. The anon key is safe to expose in the frontend.";

const createMissingProxy = () =>
  new Proxy(
    {},
    {
      get() {
        throw new Error(missingMsg);
      },
    },
  ) as unknown as SupabaseClient;

export const supabase: SupabaseClient =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : createMissingProxy();
