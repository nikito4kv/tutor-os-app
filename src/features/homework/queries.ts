import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { collectHomeworkPaths, createHomeworkSignedUrls, resolveSignedUrl } from "./files";
import { STUDENT_HISTORY_LIMIT } from "@/lib/constants";

export type HomeworkRow = Database["public"]["Tables"]["homework"]["Row"];

export type Homework = HomeworkRow & {
  attachmentSignedUrl: string | null;
  submissionSignedUrl: string | null;
};

/**
 * Homework submitted by students and awaiting the tutor's review (`submitted`),
 * across all students, newest first. Raw rows — no Storage round-trip, since the
 * dashboard inbox only needs title/student/status. RLS-scoped.
 */
export async function listHomeworkToReview(): Promise<HomeworkRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homework")
    .select("*")
    .eq("status", "submitted")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * Assigned homework whose deadline has passed and that the student hasn't
 * submitted yet (`assigned` + `due_at < now`). Rows without a `due_at` are
 * excluded (null comparison is never true). Earliest due first. RLS-scoped.
 */
export async function listOverdueHomework(): Promise<HomeworkRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homework")
    .select("*")
    .eq("status", "assigned")
    .lt("due_at", new Date().toISOString())
    .order("due_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function listHomeworksByStudent(studentId: string): Promise<Homework[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homework")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(STUDENT_HISTORY_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  // One Storage round-trip for every file across all homework (vs. one per file).
  const signed = await createHomeworkSignedUrls(supabase, collectHomeworkPaths(data));
  return data.map((homework) => ({
    ...homework,
    attachmentSignedUrl: resolveSignedUrl(signed, homework.attachment_url),
    submissionSignedUrl: resolveSignedUrl(signed, homework.submission_url),
  }));
}
