import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { CHAT_FILE_MAX_BYTES } from "./schema";

export const CHAT_FILE_BUCKET = "chat-files";
export const CHAT_MAX_FILE_BYTES = CHAT_FILE_MAX_BYTES;
export const CHAT_FILE_SIGNED_URL_TTL_SEC = 60 * 60;

type Client = SupabaseClient<Database>;

export interface ChatAttachmentPaths {
  attachment_path: string | null;
}

export function readOptionalChatFile(formData: FormData, key = "attachment"): File | null {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > CHAT_MAX_FILE_BYTES) {
    throw new Error("Файл должен быть не больше 10 МБ");
  }
  return value;
}

function sanitizeStorageFileName(fileName: string): string {
  const clean = fileName
    .trim()
    .replace(/[/\\]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return clean || "file";
}

export async function uploadChatFile({
  supabase,
  studentId,
  messageId,
  file,
}: {
  supabase: Client;
  studentId: string;
  messageId: string;
  file: File;
}): Promise<string> {
  const path = `${studentId}/${messageId}/${Date.now()}-${sanitizeStorageFileName(file.name)}`;

  const { error } = await supabase.storage.from(CHAT_FILE_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) throw new Error(error.message);
  return path;
}

export function collectChatFilePaths(rows: ChatAttachmentPaths[]): string[] {
  return Array.from(
    new Set(rows.map((row) => row.attachment_path).filter((p): p is string => !!p)),
  );
}

export function resolveChatSignedUrl(map: Map<string, string>, path: string | null): string | null {
  return path ? (map.get(path) ?? null) : null;
}

export async function createChatSignedUrls(
  supabase: Client,
  paths: (string | null)[],
): Promise<Map<string, string>> {
  const clean = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (clean.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from(CHAT_FILE_BUCKET)
    .createSignedUrls(clean, CHAT_FILE_SIGNED_URL_TTL_SEC);

  if (error || !data) return new Map();

  const map = new Map<string, string>();
  for (const item of data) {
    if (item.path && !item.error && item.signedUrl) {
      map.set(item.path, item.signedUrl);
    }
  }
  return map;
}
