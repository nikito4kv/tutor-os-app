/**
 * Helpers for the student's share code — the `<code>` in the public link
 * `/s/<code>`. A custom code is `<readable-slug>-<random-suffix>`; a default one
 * is the DB-generated random hex (no hyphen). Kept pure and **isomorphic** (Web
 * Crypto, no node imports) so it's safe to import from both server actions and
 * the client form, and trivially unit-testable.
 */

import { SHARE_SUFFIX_BYTES } from "@/lib/constants";

/** Normalize free text into a URL-safe slug: lowercase, [a-z0-9-], no edge/double hyphens. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\s_]+/g, "-") // spaces / underscores → hyphen
    .replace(/[^a-z0-9-]+/g, "") // drop everything else (incl. Cyrillic)
    .replace(/-+/g, "-") // collapse runs
    .replace(/^-+|-+$/g, ""); // trim edges
}

/**
 * The readable part of a stored code — everything before the final hyphen (the
 * random suffix). A hyphen-free token (legacy/default random hex) has none → "".
 */
export function readablePartOf(token: string): string {
  const i = token.lastIndexOf("-");
  return i === -1 ? "" : token.slice(0, i);
}

/** Unguessable hex suffix (Web Crypto; works on server and client). No hyphen. */
function randomSuffix(): string {
  const bytes = new Uint8Array(SHARE_SUFFIX_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Build a full share code from an optional readable part. Returns `null` when
 * there's no usable readable text — the caller then leaves the existing /
 * DB-default random token in place.
 */
export function buildShareToken(readable?: string | null): string | null {
  const slug = slugify(readable ?? "");
  return slug ? `${slug}-${randomSuffix()}` : null;
}
