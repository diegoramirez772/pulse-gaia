import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Same resilience pattern as openai-client.ts: every store checks this
 * first and falls back to an in-memory Map when Supabase isn't configured
 * (see Pulse Gaia — Plan de Base de Datos for the schema this expects) —
 * missing credentials shouldn't kill local dev or the standalone demo.
 */
export const supabase: SupabaseClient | null =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

export function hasSupabase(): boolean {
  return supabase !== null;
}
