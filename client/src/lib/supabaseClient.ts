import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This is a foundation-phase warning, not a hard failure: the app should
  // still boot and render the shell/dashboard placeholders so the UI can be
  // developed before Supabase credentials are configured.
  console.warn(
    "[supabase] VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are not set. " +
      "Add them to your root .env file before wiring up real data."
  );
}

/**
 * Shared Supabase client for the clinic workspace.
 *
 * No tables, queries, or schema are defined here yet — this only
 * establishes the client so later phases can connect to the existing
 * Perfect Smile database.
 */
export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key"
);
