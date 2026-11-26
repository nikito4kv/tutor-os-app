import { describe, expect, it } from "vitest";
import {
  LESSON_NOTE_MAX,
  LESSON_TOPIC_MAX,
  LONG_TEXT_MAX,
  SHORT_TEXT_MAX,
  SUPPORT_MESSAGE_MAX,
} from "@/lib/constants";
import { parseLessonForm } from "@/features/lessons/schema";
import {
  homeworkReviewSchema,
  homeworkSchema,
  homeworkSubmissionSchema,
} from "@/features/homework/schema";
import { studentSchema } from "@/features/students/schema";
import { supportFeedbackSchema } from "@/features/support/schema";

const STUDENT_ID = "00000000-0000-4000-8000-000000000001";

function lessonForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  const fields = {
    student_id: STUDENT_ID,
    starts_at: "2026-07-02T18:00",
    duration_min: "60",
    topic: "Алгебра",
    note: "Квадратные уравнения",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

describe("lesson form contract", () => {
  it("accepts a valid lesson and trims optional text", () => {
    const result = parseLessonForm(lessonForm({ topic: "  Алгебра  ", note: "   " }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topic).toBe("Алгебра");
      expect(result.data.note).toBeNull();
    }
  });

  it("rejects invalid identifiers, dates, durations and text limits", () => {
    expect(parseLessonForm(lessonForm({ student_id: "invalid" })).success).toBe(false);
    expect(parseLessonForm(lessonForm({ starts_at: "invalid" })).success).toBe(false);
    expect(parseLessonForm(lessonForm({ duration_min: "0" })).success).toBe(false);
    expect(parseLessonForm(lessonForm({ topic: "x".repeat(LESSON_TOPIC_MAX + 1) })).success).toBe(
      false,
    );
    expect(parseLessonForm(lessonForm({ note: "x".repeat(LESSON_NOTE_MAX + 1) })).success).toBe(
      false,
    );
  });
});

describe("student form contract", () => {
  it("normalizes optional fields and a readable share code", () => {
    const result = studentSchema.parse({
      name: "  Анна  ",
      contact: "   ",
      parent_contact: " +79990000000 ",
      subject: " Математика ",
      level: "",
      share_code: " Anna Class ",
    });

    expect(result).toMatchObject({
      name: "Анна",
      contact: null,
      parent_contact: "+79990000000",
      subject: "Математика",
      level: null,
      share_code: "anna-class",
    });
  });

  it("rejects blank names and overlong short fields", () => {
    expect(studentSchema.safeParse({ name: " ", share_code: "" }).success).toBe(false);
    expect(
      studentSchema.safeParse({
        name: "Анна",
        contact: "x".repeat(SHORT_TEXT_MAX + 1),
        share_code: "",
      }).success,
    ).toBe(false);
  });
});

describe("homework form contract", () => {
  it("accepts trimmed content and nullable lesson id", () => {
    const result = homeworkSchema.parse({
      title: "  Упражнение  ",
      description: "  Решить задачи  ",
      lesson_id: "",
    });

    expect(result).toEqual({
      title: "Упражнение",
      description: "Решить задачи",
      lesson_id: null,
    });
  });

  it("enforces title, body, submission and review limits", () => {
    expect(homeworkSchema.safeParse({ title: "x".repeat(SHORT_TEXT_MAX + 1) }).success).toBe(false);
    expect(
      homeworkSchema.safeParse({
        title: "Задание",
        description: "x".repeat(LONG_TEXT_MAX + 1),
      }).success,
    ).toBe(false);
    expect(
      homeworkSubmissionSchema.safeParse({
        submission_text: "x".repeat(LONG_TEXT_MAX + 1),
      }).success,
    ).toBe(false);
    expect(homeworkReviewSchema.safeParse({ feedback: " " }).success).toBe(false);
  });
});

describe("support form contract", () => {
  it("accepts a valid message and normalizes optional fields", () => {
    const result = supportFeedbackSchema.parse({
      category: "bug",
      message: "  Не открывается расписание  ",
      contact: "   ",
      page_url: " https://example.test/schedule ",
    });

    expect(result).toEqual({
      category: "bug",
      message: "Не открывается расписание",
      contact: null,
      page_url: "https://example.test/schedule",
    });
  });

  it("enforces category and the 500 character message limit", () => {
    expect(
      supportFeedbackSchema.safeParse({ category: "unknown", message: "Достаточно текста" })
        .success,
    ).toBe(false);
    expect(
      supportFeedbackSchema.safeParse({
        category: "bug",
        message: "x".repeat(SUPPORT_MESSAGE_MAX + 1),
      }).success,
    ).toBe(false);
  });
});
