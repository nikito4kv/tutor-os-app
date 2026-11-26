import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  runScheduledNotifications: vi.fn(),
}));

vi.mock("@/features/telegram/reminders", () => ({
  runScheduledNotifications: mocks.runScheduledNotifications,
}));

import { GET } from "./route";

describe("scheduled notifications authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    mocks.runScheduledNotifications.mockResolvedValue({ sent: 0, failed: 0 });
  });

  it("rejects a secret passed in the URL", async () => {
    const request = new NextRequest("http://localhost/api/cron/notifications?token=cron-secret");

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(mocks.runScheduledNotifications).not.toHaveBeenCalled();
  });

  it("accepts the exact bearer secret", async () => {
    const request = new NextRequest("http://localhost/api/cron/notifications", {
      headers: { authorization: "Bearer cron-secret" },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mocks.runScheduledNotifications).toHaveBeenCalledOnce();
  });

  it("rejects an incorrect bearer secret", async () => {
    const request = new NextRequest("http://localhost/api/cron/notifications", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(mocks.runScheduledNotifications).not.toHaveBeenCalled();
  });
});
