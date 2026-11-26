import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { isMissingChatTableError } from "./errors";
import { createChatSignedUrls, resolveChatSignedUrl } from "./files";

type ChatMessageRow = Database["public"]["Tables"]["chat_message"]["Row"];
export type ChatMessage = ChatMessageRow & { attachmentSignedUrl: string | null };

export interface ChatConversation {
  studentId: string;
  studentName: string;
  subject: string | null;
  lastMessage: Pick<ChatMessageRow, "sender" | "body" | "attachment_name" | "created_at"> | null;
  messageCount: number;
  unreadCount: number;
  lastActivityAt: string;
}

export interface ChatThread {
  studentId: string;
  studentName: string;
  subject: string | null;
  messages: ChatMessage[];
}

const CHAT_HISTORY_LIMIT = 200;

export async function listChatConversations(): Promise<ChatConversation[]> {
  const supabase = await createClient();
  const { data: students, error: studentsError } = await supabase
    .from("student")
    .select("id, name, subject, created_at")
    .order("created_at", { ascending: false });

  if (studentsError) throw new Error(studentsError.message);

  const studentRows = students ?? [];
  if (studentRows.length === 0) return [];

  const ids = studentRows.map((student) => student.id);
  const { data: messages, error: messagesError } = await supabase
    .from("chat_message")
    .select("student_id, sender, body, attachment_name, read_at, created_at")
    .in("student_id", ids)
    .order("created_at", { ascending: false });

  if (messagesError) {
    if (isMissingChatTableError(messagesError)) {
      return studentRows.map((student) => ({
        studentId: student.id,
        studentName: student.name,
        subject: student.subject,
        lastMessage: null,
        messageCount: 0,
        unreadCount: 0,
        lastActivityAt: student.created_at,
      }));
    }

    throw new Error(messagesError.message);
  }

  const stats = new Map<
    string,
    {
      count: number;
      last: Pick<ChatMessageRow, "sender" | "body" | "attachment_name" | "created_at"> | null;
      unread: number;
    }
  >();

  for (const message of messages ?? []) {
    const current = stats.get(message.student_id) ?? { count: 0, last: null, unread: 0 };
    current.count += 1;
    if (message.sender === "student" && !message.read_at) current.unread += 1;
    current.last ??= {
      sender: message.sender,
      body: message.body,
      attachment_name: message.attachment_name,
      created_at: message.created_at,
    };
    stats.set(message.student_id, current);
  }

  return studentRows
    .map((student) => {
      const stat = stats.get(student.id);
      return {
        studentId: student.id,
        studentName: student.name,
        subject: student.subject,
        lastMessage: stat?.last ?? null,
        messageCount: stat?.count ?? 0,
        unreadCount: stat?.unread ?? 0,
        lastActivityAt: stat?.last?.created_at ?? student.created_at,
      };
    })
    .sort((a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt));
}

export async function getTutorUnreadChatCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error: messagesError } = await supabase
    .from("chat_message")
    .select("id", { count: "exact", head: true })
    .eq("sender", "student")
    .is("read_at", null);

  if (messagesError) {
    if (!isMissingChatTableError(messagesError)) {
      console.warn("[chat] Failed to load the unread message count:", messagesError.message);
    }
    return 0;
  }

  return count ?? 0;
}

export async function getChatThread(studentId: string): Promise<ChatThread | null> {
  const supabase = await createClient();
  const { data: student, error: studentError } = await supabase
    .from("student")
    .select("id, name, subject")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) throw new Error(studentError.message);
  if (!student) return null;

  const { data: messages, error: messagesError } = await supabase
    .from("chat_message")
    .select("*")
    .eq("student_id", student.id)
    .order("created_at", { ascending: true })
    .limit(CHAT_HISTORY_LIMIT);

  if (messagesError) {
    if (isMissingChatTableError(messagesError)) {
      return {
        studentId: student.id,
        studentName: student.name,
        subject: student.subject,
        messages: [],
      };
    }

    throw new Error(messagesError.message);
  }

  const rows = messages ?? [];
  const signed = await createChatSignedUrls(
    supabase,
    rows.map((message) => message.attachment_path),
  );

  return {
    studentId: student.id,
    studentName: student.name,
    subject: student.subject,
    messages: rows.map((message) => ({
      ...message,
      attachmentSignedUrl: resolveChatSignedUrl(signed, message.attachment_path),
    })),
  };
}
