import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Supabase client singleton.
 * Returns a functional client when env vars are set,
 * or a client with empty strings during build (which will fail gracefully at query time).
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

/** Check if Supabase is properly configured */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl) && Boolean(supabaseAnonKey);
}
