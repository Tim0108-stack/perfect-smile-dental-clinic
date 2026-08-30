import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export function createSupabaseRequestClient(accessToken: string) {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase server configuration is missing");
  }
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}