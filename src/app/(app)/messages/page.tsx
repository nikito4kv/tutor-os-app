import type { Metadata } from "next";
import { ChatPage } from "@/features/chat/chat-page";
import { getChatThread, listChatConversations } from "@/features/chat/queries";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.chat.title} — ${t.common.appName}` };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student } = await searchParams;
  const conversations = await listChatConversations();
  const fallbackId = conversations[0]?.studentId;
  const selectedId = conversations.some((item) => item.studentId === student)
    ? student
    : fallbackId;
  const selected = selectedId ? await getChatThread(selectedId) : null;

  return <ChatPage conversations={conversations} selected={selected} />;
}
