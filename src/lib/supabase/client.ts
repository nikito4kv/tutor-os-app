import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/config";
import type { Database } from "@/lib/supabase/database.types";

/** Supabase client for use in Client Components. Subject to RLS. */
export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
