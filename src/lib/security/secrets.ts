import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

function digestSecret(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function matchesSecret(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!provided || !expected) return false;
  return timingSafeEqual(digestSecret(provided), digestSecret(expected));
}

export function readBearerToken(authorization: string | null): string | null {
  const match = /^Bearer[ \t]+(\S+)[ \t]*$/i.exec(authorization ?? "");
  return match?.[1] ?? null;
}
