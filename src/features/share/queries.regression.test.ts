import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

import { getShareView } from "./queries";

describe("getShareView regression", () => {
  it.fails("does not mask a database failure as an unknown share token", async () => {
    const studentQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "database unavailable" },
      }),
    };
    studentQuery.select.mockReturnValue(studentQuery);
    studentQuery.eq.mockReturnValue(studentQuery);
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => studentQuery),
    });

    await expect(getShareView("known-token")).rejects.toThrow("database unavailable");
  });

  it("returns null when the token is genuinely unknown", async () => {
    const studentQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    studentQuery.select.mockReturnValue(studentQuery);
    studentQuery.eq.mockReturnValue(studentQuery);
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => studentQuery),
    });

    await expect(getShareView("unknown-token")).resolves.toBeNull();
  });
});
