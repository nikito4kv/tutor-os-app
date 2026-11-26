import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  notifyStudentByTelegram: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/email/notify", () => ({ notifyStudentByEmail: vi.fn() }));
vi.mock("@/lib/telegram/notify", () => ({
  notifyStudentByTelegram: mocks.notifyStudentByTelegram,
  notifyTutorByTelegram: vi.fn(),
}));

import { updateLessonAction } from "@/features/lessons/actions";

const ACTUAL_STUDENT_ID = "00000000-0000-4000-8000-000000000020";
const SPOOFED_STUDENT_ID = "00000000-0000-4000-8000-000000000099";

function chainWithResult(data: object | null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    update: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.update.mockReturnValue(query);
  return query;
}

describe("lesson notification target", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notifyStudentByTelegram.mockResolvedValue(undefined);
  });

  it("uses the RLS-authorized lesson student instead of form data", async () => {
    const beforeQuery = chainWithResult({
      starts_at: "2026-07-03T10:00:00.000Z",
      student_id: ACTUAL_STUDENT_ID,
    });
    const updateQuery = chainWithResult({ id: "lesson-id" });
    const from = vi.fn().mockReturnValueOnce(beforeQuery).mockReturnValueOnce(updateQuery);
    mocks.createClient.mockResolvedValue({ from });

    const form = new FormData();
    form.set("lesson_id", "lesson-id");
    form.set("student_id", SPOOFED_STUDENT_ID);
    form.set("starts_at", "2026-07-03T12:00:00.000Z");
    form.set("duration_min", "60");

    await expect(updateLessonAction({}, form)).resolves.toEqual({ ok: true });
    expect(mocks.notifyStudentByTelegram).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: ACTUAL_STUDENT_ID }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/students/${ACTUAL_STUDENT_ID}`);
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith(`/students/${SPOOFED_STUDENT_ID}`);
  });
});
