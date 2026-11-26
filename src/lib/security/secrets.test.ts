import { describe, expect, it } from "vitest";
import { matchesSecret, readBearerToken } from "./secrets";

describe("matchesSecret", () => {
  it("accepts only the exact non-empty secret", () => {
    expect(matchesSecret("secret-value", "secret-value")).toBe(true);
    expect(matchesSecret("secret-value", "other-value")).toBe(false);
    expect(matchesSecret("", "secret-value")).toBe(false);
    expect(matchesSecret(null, "secret-value")).toBe(false);
    expect(matchesSecret("secret-value", undefined)).toBe(false);
  });

  it("compares unicode secrets without length-dependent failures", () => {
    expect(matchesSecret("секрет-🔒", "секрет-🔒")).toBe(true);
    expect(matchesSecret("секрет-🔒", "секрет")).toBe(false);
  });
});

describe("readBearerToken", () => {
  it("parses a single bearer credential", () => {
    expect(readBearerToken("Bearer secret-value")).toBe("secret-value");
    expect(readBearerToken("bearer\tsecret-value ")).toBe("secret-value");
  });

  it("rejects missing and malformed authorization headers", () => {
    expect(readBearerToken(null)).toBeNull();
    expect(readBearerToken("Basic secret-value")).toBeNull();
    expect(readBearerToken("Bearer")).toBeNull();
    expect(readBearerToken("Bearer first second")).toBeNull();
  });
});
