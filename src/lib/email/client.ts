import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/config";

let cached: Resend | null = null;

/**
 * Lazily build the Resend client from RESEND_API_KEY. Returns `null` when no key
 * is configured (local dev / MVP) so callers fall back to mock mode instead of
 * throwing. The instance is cached for the lifetime of the server process.
 */
export function getResend(): Resend | null {
  const key = env.resendApiKey;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}
