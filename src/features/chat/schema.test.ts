import { describe, expect, it } from "vitest";
import { CHAT_MESSAGE_MAX, chatMessageSchema } from "./schema";

describe("chatMessageSchema", () => {
  it("trims message body", () => {
    const parsed = chatMessageSchema.parse({ body: "  hello  " });

    expect(parsed.body).toBe("hello");
  });

  it("allows an empty body so file-only messages can be validated in actions", () => {
    expect(chatMessageSchema.parse({ body: "   " }).body).toBe("");
  });

  it("rejects too long messages", () => {
    expect(chatMessageSchema.safeParse({ body: "x".repeat(CHAT_MESSAGE_MAX + 1) }).success).toBe(
      false,
    );
  });
});
