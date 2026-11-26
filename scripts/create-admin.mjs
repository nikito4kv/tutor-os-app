/**
 * Create (or refresh) an admin account and add it to the `admin_user` allowlist.
 *
 * Idempotent: if the auth user already exists, it's reused and its password is
 * reset to the value below; the allowlist row is upserted. Uses the service-role
 * key (bypasses RLS) — server-only, never shipped to the client.
 *
 * Requires migration 0012_admin_role.sql to be applied first.
 *
 * Run (loads Supabase URL + service-role key from .env.local):
 *   node --env-file=.env.local scripts/create-admin.mjs
 *
 * Required: ADMIN_EMAIL, ADMIN_PASSWORD. Optional: ADMIN_NAME.
 */

import { createClient } from "@supabase/supabase-js";

const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const NAME = process.env.ADMIN_NAME ?? "Admin";
if (!EMAIL || !PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (no defaults on purpose).");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with:  node --env-file=.env.local scripts/create-admin.mjs",
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) break;
  }
  return null;
}

let userId;
const created = await db.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { name: NAME },
});

if (created.error) {
  const existing = await findUserByEmail(EMAIL);
  if (!existing) {
    console.error("Failed to create auth user:", created.error.message);
    process.exit(1);
  }
  userId = existing.id;
  await db.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true });
  console.log(`↻ Auth user already existed — reused and password reset (${EMAIL}).`);
} else {
  userId = created.data.user.id;
  console.log(`✓ Auth user created (${EMAIL}).`);
}

const { error: upsertError } = await db
  .from("admin_user")
  .upsert({ user_id: userId, note: "dev admin" }, { onConflict: "user_id" });
if (upsertError) {
  console.error("Failed to add to admin_user allowlist:", upsertError.message);
  console.error("Is migration 0012_admin_role.sql applied? (supabase db push)");
  process.exit(1);
}

const { count } = await db
  .from("admin_user")
  .select("user_id", { count: "exact", head: true })
  .eq("user_id", userId);

console.log("✓ Added to admin_user allowlist.");
console.log(`  user_id : ${userId}`);
console.log(`  in allowlist: ${count === 1 ? "yes" : "NO (check RLS/migration)"}`);
console.log("\nLog in:");
console.log(`  email    : ${EMAIL}`);
console.log(`  password : ${PASSWORD}`);
console.log("After sign-in you'll land on /admin.");
