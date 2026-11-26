import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { getCurrentTutor, getCurrentUser } from "@/lib/auth";

const USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "tutor@example.com",
  user_metadata: {},
};

describe("server authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers());
  });

  it("verifies the user through Supabase Auth", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: USER },
      error: null,
    });
    mocks.createClient.mockResolvedValue({ auth: { getUser } });

    await expect(getCurrentUser()).resolves.toEqual(USER);
    expect(getUser).toHaveBeenCalledOnce();
  });

  it("fails closed when the authenticated tutor profile is missing", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: USER },
          error: null,
        }),
      },
      from: vi.fn(() => query),
    });

    await expect(getCurrentTutor()).rejects.toThrow("Tutor profile is unavailable");
  });
});
