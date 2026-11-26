import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CURRENT_PATH_HEADER, loginPathWithRedirect } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type TutorProfile = Database["public"]["Tables"]["tutor"]["Row"];

/**
 * The signed-in user, verified by Supabase Auth. Server Components must not
 * authorize from getSession(), because it only decodes the cookie locally.
 * Memoised per request so callers share one verified lookup.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error ? null : user;
});

async function currentRequestPath(): Promise<string | undefined> {
  const requestHeaders = await headers();
  return requestHeaders.get(CURRENT_PATH_HEADER) ?? undefined;
}

/**
 * Returns the signed-in tutor's profile, or redirects to /login. Memoised per
 * request, so layout + page in one render share a single user/profile lookup.
 */
export const getCurrentTutor = cache(async (): Promise<TutorProfile> => {
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPathWithRedirect(await currentRequestPath()));
  }

  const supabase = await createClient();
  const { data: tutor, error } = await supabase
    .from("tutor")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !tutor) {
    throw new Error("Tutor profile is unavailable");
  }

  return tutor;
});

/**
 * Is the signed-in user an admin (developer)? Checks the `admin_user` allowlist
 * via the `is_admin()` RPC (SECURITY DEFINER reads the locked table). Memoised
 * per request. Returns false for anonymous users.
 */
export const getIsAdmin = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
});

/**
 * Gate for the (admin) layout: not signed in → /login; signed in but not an
 * admin → /students (the tutor's home). The DB still enforces access (gated
 * RPC + RLS) regardless, so this is the friendly first line of defence.
 */
export const assertAdmin = cache(async (): Promise<void> => {
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPathWithRedirect(await currentRequestPath()));
  }
  if (!(await getIsAdmin())) {
    redirect("/students");
  }
});
