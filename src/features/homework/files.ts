import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const HOMEWORK_BUCKET = "homework";
export const HOMEWORK_MAX_FILE_BYTES = 35 * 1024 * 1024;
/** Lifetime of a homework file's signed URL, in seconds (1 hour). */
export const HOMEWORK_SIGNED_URL_TTL_SEC = 60 * 60;

type Client = SupabaseClient<Database>;

/** A row carrying the two storage paths a homework can reference. */
export type HomeworkFilePaths = { attachment_url: string | null; submission_url: string | null };

export function readOptionalHomeworkFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > HOMEWORK_MAX_FILE_BYTES) {
    throw new Error("Файл должен быть не больше 35 МБ");
  }
  return value;
}

export function sanitizeStorageFileName(fileName: string): string {
  const clean = fileName
    .trim()
    .replace(/[/\\]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return clean || "file";
}

export async function uploadHomeworkFile({
  supabase,
  studentId,
  homeworkId,
  file,
  kind,
}: {
  supabase: Client;
  studentId: string;
  homeworkId: string;
  file: File;
  kind: "assignment" | "submission";
}): Promise<string> {
  const path = `${studentId}/${kind}/${homeworkId}/${Date.now()}-${sanitizeStorageFileName(
    file.name,
  )}`;

  const { error } = await supabase.storage.from(HOMEWORK_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) throw new Error(error.message);
  return path;
}

/** Unique, non-empty storage paths referenced by a set of homework rows. Pure. */
export function collectHomeworkPaths(rows: HomeworkFilePaths[]): string[] {
  const paths: string[] = [];
  for (const r of rows) {
    if (r.attachment_url) paths.push(r.attachment_url);
    if (r.submission_url) paths.push(r.submission_url);
  }
  return Array.from(new Set(paths));
}

/** Look up a signed URL by path in a prepared map; null when absent or empty. Pure. */
export function resolveSignedUrl(map: Map<string, string>, path: string | null): string | null {
  return path ? (map.get(path) ?? null) : null;
}

/**
 * Sign many homework files in ONE Storage round-trip (vs. one request per file).
 * Returns a path→signedUrl map; per-file failures are simply absent (→ null on
 * lookup). No paths → no network call. All paths live in the same bucket.
 */
export async function createHomeworkSignedUrls(
  supabase: Client,
  paths: (string | null)[],
): Promise<Map<string, string>> {
  const clean = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (clean.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from(HOMEWORK_BUCKET)
    .createSignedUrls(clean, HOMEWORK_SIGNED_URL_TTL_SEC);

  if (error || !data) return new Map();

  const map = new Map<string, string>();
  for (const item of data) {
    if (item.path && !item.error && item.signedUrl) {
      map.set(item.path, item.signedUrl);
    }
  }
  return map;
}

/** Single-file signed URL — thin wrapper over the batch helper, for one-off needs. */
export async function createHomeworkSignedUrl(
  supabase: Client,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const map = await createHomeworkSignedUrls(supabase, [path]);
  return resolveSignedUrl(map, path);
}
