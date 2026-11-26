import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import {
  collectHomeworkPaths,
  createHomeworkSignedUrls,
  resolveSignedUrl,
} from "@/features/homework/files";
import { SHARE_UPCOMING_LIMIT } from "@/lib/constants";
import { createChatSignedUrls, resolveChatSignedUrl } from "@/features/chat/files";

type Lesson = Database["public"]["Tables"]["lesson"]["Row"];
type Homework = Database["public"]["Tables"]["homework"]["Row"];
type ChatMessageRow = Database["public"]["Tables"]["chat_message"]["Row"];
type ChatMessage = ChatMessageRow & { attachmentSignedUrl: string | null };

export interface ShareView {
  studentId: string;
  studentName: string;
  subject: string | null;
  tutorName: string | null;
  lessonsLeft: number;
  todayLessonsCount: number;
  unreadChatCount: number;
  upcomingLessons: Pick<Lesson, "id" | "starts_at" | "topic" | "duration_min">[];
  chatMessages: ChatMessage[];
  homework: (Pick<
    Homework,
    "id" | "title" | "description" | "status" | "feedback" | "submission_text" | "due_at"
  > & {
    attachmentSignedUrl: string | null;
    submissionSignedUrl: string | null;
  })[];
}

/**
 * Loads the public student view by share_token. Uses the service-role client and
 * is ALWAYS scoped by the token — the token is the access credential. Returns
 * null for an unknown token. This is the only sanctioned RLS-bypass path.
 */
export async function getShareView(token: string): Promise<ShareView | null> {
  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("student")
    .select("id, name, subject, tutor_id")
    .eq("share_token", token)
    .maybeSingle();

  if (!student) return null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [
    { data: tutor },
    { data: packages },
    { data: lessons },
    { count: todayLessonsCount },
    { data: homework },
    { data: chatMessages },
    { count: unreadChatCount },
  ] = await Promise.all([
    // The student/parent lands on a cold link — surface whose workspace this is.
    supabase.from("tutor").select("name").eq("id", student.tutor_id).maybeSingle(),
    supabase.from("package").select("lessons_left").eq("student_id", student.id),
    supabase
      .from("lesson")
      .select("id, starts_at, topic, duration_min")
      .eq("student_id", student.id)
      .eq("status", "scheduled")
      .order("starts_at", { ascending: true })
      .limit(SHARE_UPCOMING_LIMIT),
    supabase
      .from("lesson")
      .select("id", { count: "exact", head: true })
      .eq("student_id", student.id)
      .eq("status", "scheduled")
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", tomorrowStart.toISOString()),
    supabase
      .from("homework")
      .select(
        "id, title, description, attachment_url, status, submission_text, submission_url, feedback, due_at",
      )
      .eq("student_id", student.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("chat_message")
      .select("*")
      .eq("student_id", student.id)
      .order("created_at", { ascending: true })
      .limit(200),
    supabase
      .from("chat_message")
      .select("id", { count: "exact", head: true })
      .eq("student_id", student.id)
      .eq("sender", "tutor")
      .is("read_at", null),
  ]);

  // One Storage round-trip for every file across all homework (vs. one per file).
  const signed = await createHomeworkSignedUrls(supabase, collectHomeworkPaths(homework ?? []));
  const homeworkWithSignedUrls = (homework ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    submission_text: item.submission_text,
    feedback: item.feedback,
    due_at: item.due_at,
    attachmentSignedUrl: resolveSignedUrl(signed, item.attachment_url),
    submissionSignedUrl: resolveSignedUrl(signed, item.submission_url),
  }));

  const chatRows = chatMessages ?? [];
  const chatSigned = await createChatSignedUrls(
    supabase,
    chatRows.map((message) => message.attachment_path),
  );

  return {
    studentId: student.id,
    studentName: student.name,
    subject: student.subject,
    tutorName: tutor?.name ?? null,
    lessonsLeft: (packages ?? []).reduce((sum, p) => sum + p.lessons_left, 0),
    todayLessonsCount: todayLessonsCount ?? 0,
    unreadChatCount: unreadChatCount ?? 0,
    upcomingLessons: lessons ?? [],
    chatMessages: chatRows.map((message) => ({
      ...message,
      attachmentSignedUrl: resolveChatSignedUrl(chatSigned, message.attachment_path),
    })),
    homework: homeworkWithSignedUrls,
  };
}
