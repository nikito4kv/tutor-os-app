import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/config";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Service-role client. BYPASSES RLS — use ONLY in trusted server code and ALWAYS
 * scope every query yourself (e.g. by a validated share_token). Never import this
 * into a Client Component. This powers the no-login student page.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
