import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { env } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION === "1" ? describe : describe.skip;

interface AuthTokenResponse {
  access_token?: string;
}

function feedbackRequest(accessToken: string, tutorId: string | null, message: string) {
  return fetch(`${env.supabaseUrl}/rest/v1/feedback`, {
    method: "POST",
    headers: {
      apikey: env.supabaseAnonKey,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      tutor_id: tutorId,
      category: "bug",
      message,
    }),
  });
}

runIntegration("feedback RLS", () => {
  const email = `feedback-${randomUUID()}@example.test`;
  const password = "Integration1!";
  const admin = createAdminClient();
  let tutorId = "";

  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Feedback tutor" },
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? "Failed to create feedback tutor");
    }
    tutorId = data.user.id;
  });

  afterAll(async () => {
    if (tutorId) await admin.auth.admin.deleteUser(tutorId);
  });

  it("denies anonymous inserts and binds authenticated inserts to auth.uid()", async () => {
    const anonymous = await feedbackRequest(
      env.supabaseAnonKey,
      null,
      "Anonymous feedback must be rejected",
    );
    expect(anonymous.ok).toBe(false);

    const signIn = await fetch(`${env.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: env.supabaseAnonKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    expect(signIn.ok).toBe(true);
    const auth = (await signIn.json()) as AuthTokenResponse;
    if (!auth.access_token) throw new Error("Auth response has no access token");

    const ownFeedback = await feedbackRequest(
      auth.access_token,
      tutorId,
      "Authenticated feedback is accepted",
    );
    expect(ownFeedback.ok).toBe(true);

    const missingOwner = await feedbackRequest(
      auth.access_token,
      null,
      "Authenticated feedback without owner is rejected",
    );
    expect(missingOwner.ok).toBe(false);
  });
});
