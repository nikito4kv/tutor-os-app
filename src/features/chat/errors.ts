interface SupabaseLikeError {
  code?: string;
  message?: string;
}

export function isMissingChatTableError(error: SupabaseLikeError | null | undefined) {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    message.includes("public.chat_message") ||
    message.includes("attachment_path") ||
    message.includes("attachment_name") ||
    message.includes("read_at") ||
    (message.includes("schema cache") && message.includes("chat_message"))
  );
}
