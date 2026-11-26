import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createHomework: vi.fn(),
  revalidatePath: vi.fn(),
  notifyStudentByTelegram: vi.fn(),
  notifyTutorByTelegram: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/features/homework/create", () => ({
  createHomeworkFromForm: mocks.createHomework,
}));
vi.mock("@/lib/email/notify", () => ({ notifyStudentByEmail: vi.fn() }));
vi.mock("@/lib/telegram/notify", () => ({
  notifyStudentByTelegram: mocks.notifyStudentByTelegram,
  notifyTutorByTelegram: mocks.notifyTutorByTelegram,
}));

import { completeLessonAction } from "@/features/lessons/actions";

const LESSON_ID = "00000000-0000-4000-8000-000000000010";
const STUDENT_ID = "00000000-0000-4000-8000-000000000020";

function completionForm(): FormData {
  const form = new FormData();
  form.set("lesson_id", LESSON_ID);
  form.set("student_id", "00000000-0000-4000-8000-000000000099");
  form.set("title", "Домашнее задание");
  form.set("description", "Решить упражнения");
  return form;
}

function lessonQuery() {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { student_id: STUDENT_ID },
      error: null,
    }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

describe("completeLessonAction retries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createHomework.mockResolvedValue(null);
  });

  it("does not duplicate homework when the lesson is already completed", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { lessons_left: 3, already_done: true },
      error: null,
    });
    mocks.createClient.mockResolvedValue({
      rpc,
      from: vi.fn(() => lessonQuery()),
    });

    const result = await completeLessonAction({}, completionForm());

    expect(result).toMatchObject({ ok: true, lessonsLeft: 3 });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(mocks.createHomework).not.toHaveBeenCalled();
    expect(mocks.notifyTutorByTelegram).not.toHaveBeenCalled();
  });

  it("creates homework for the student resolved from the lesson", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { lessons_left: 4, already_done: false },
      error: null,
    });
    const studentQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    studentQuery.select.mockReturnValue(studentQuery);
    studentQuery.eq.mockReturnValue(studentQuery);
    mocks.createClient.mockResolvedValue({
      rpc,
      from: vi.fn((table: string) => (table === "lesson" ? lessonQuery() : studentQuery)),
    });

    const result = await completeLessonAction({}, completionForm());

    expect(result).toMatchObject({ ok: true, lessonsLeft: 4 });
    expect(mocks.createHomework).toHaveBeenCalledTimes(1);
    expect(mocks.createHomework).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: STUDENT_ID,
        lessonId: LESSON_ID,
        title: "Домашнее задание",
      }),
    );
  });
});
