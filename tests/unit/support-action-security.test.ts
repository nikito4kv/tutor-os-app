import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { submitSupportFeedbackAction } from "@/features/support/actions";
import { t } from "@/lib/i18n";

function feedbackForm(): FormData {
  const form = new FormData();
  form.set("category", "bug");
  form.set("message", "Подробное описание ошибки");
  form.set("contact", "");
  form.set("page_url", "");
  return form;
}

describe("support feedback authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers());
  });

  it("does not insert anonymous feedback", async () => {
    const insert = vi.fn();
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(() => ({ insert })),
    });

    const result = await submitSupportFeedbackAction({}, feedbackForm());

    expect(result).toEqual({ error: t.support.sessionExpired });
    expect(insert).not.toHaveBeenCalled();
  });

  it("binds feedback to the verified user", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "00000000-0000-4000-8000-000000000001" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({ insert })),
    });

    await expect(submitSupportFeedbackAction({}, feedbackForm())).resolves.toEqual({
      ok: true,
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tutor_id: "00000000-0000-4000-8000-000000000001",
      }),
    );
  });
});
