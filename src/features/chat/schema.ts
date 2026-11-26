import { z } from "zod";

export const CHAT_MESSAGE_MAX = 1000;
export const CHAT_FILE_MAX_BYTES = 10 * 1024 * 1024;

export const chatMessageSchema = z.object({
  body: z.string().trim().max(CHAT_MESSAGE_MAX, "Сообщение слишком длинное"),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

export function parseChatMessageForm(formData: FormData) {
  return chatMessageSchema.safeParse({
    body: formData.get("body") ?? "",
  });
}
