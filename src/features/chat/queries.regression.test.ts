import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createSignedUrls: vi.fn(),
  resolveSignedUrl: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("./files", () => ({
  createChatSignedUrls: mocks.createSignedUrls,
  resolveChatSignedUrl: mocks.resolveSignedUrl,
}));

import { getChatThread } from "./queries";

describe("getChatThread regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSignedUrls.mockResolvedValue(new Map());
    mocks.resolveSignedUrl.mockReturnValue(null);
  });

  it.fails("loads the newest history window instead of the oldest 200 messages", async () => {
    const older = {
      id: "older",
      student_id: "student-1",
      sender: "student",
      body: "first",
      attachment_path: null,
      attachment_name: null,
      attachment_type: null,
      attachment_size: null,
      read_at: null,
      created_at: "2026-07-02T10:00:00.000Z",
    };
    const newer = {
      ...older,
      id: "newer",
      body: "second",
      created_at: "2026-07-02T11:00:00.000Z",
    };

    const studentQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "student-1", name: "Анна", subject: "Математика" },
        error: null,
      }),
    };
    studentQuery.select.mockReturnValue(studentQuery);
    studentQuery.eq.mockReturnValue(studentQuery);

    const messageQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn().mockResolvedValue({ data: [older, newer], error: null }),
    };
    messageQuery.select.mockReturnValue(messageQuery);
    messageQuery.eq.mockReturnValue(messageQuery);
    messageQuery.order.mockReturnValue(messageQuery);

    mocks.createClient.mockResolvedValue({
      from: vi.fn((table: string) => (table === "student" ? studentQuery : messageQuery)),
    });

    await getChatThread("student-1");

    expect(messageQuery.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });
});
