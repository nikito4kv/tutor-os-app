import { describe, expect, it } from "vitest";
import {
  buildBotDeepLink,
  generateTutorLinkCode,
  parseCommand,
  parseStartPayload,
  tutorStartPayload,
} from "./link-code";

describe("parseStartPayload", () => {
  it("returns null for empty payload", () => {
    expect(parseStartPayload("")).toBeNull();
    expect(parseStartPayload(undefined)).toBeNull();
    expect(parseStartPayload("   ")).toBeNull();
  });
  it("routes the t_ prefix to a tutor code", () => {
    expect(parseStartPayload("t_abc123")).toEqual({ kind: "tutor", code: "abc123" });
  });
  it("returns null for an empty tutor code", () => {
    expect(parseStartPayload("t_")).toBeNull();
  });
  it("treats a bare share token as a student link", () => {
    expect(parseStartPayload("nikita-math-7f3a8b2c")).toEqual({
      kind: "student",
      token: "nikita-math-7f3a8b2c",
    });
  });
  it("treats a default hex token as a student link", () => {
    expect(parseStartPayload("00112233445566778899aabbccddeeff")).toEqual({
      kind: "student",
      token: "00112233445566778899aabbccddeeff",
    });
  });
});

describe("parseCommand", () => {
  it("ignores non-commands", () => {
    expect(parseCommand("hello")).toEqual({ kind: "other" });
    expect(parseCommand("")).toEqual({ kind: "other" });
  });
  it("parses /start with a tutor payload", () => {
    expect(parseCommand("/start t_abc")).toEqual({
      kind: "start",
      target: { kind: "tutor", code: "abc" },
    });
  });
  it("parses /start with a student token", () => {
    expect(parseCommand("/start nikita-7f3a")).toEqual({
      kind: "start",
      target: { kind: "student", token: "nikita-7f3a" },
    });
  });
  it("parses a bare /start as a start with no target", () => {
    expect(parseCommand("/start")).toEqual({ kind: "start", target: null });
  });
  it("strips a @botname suffix used in groups", () => {
    expect(parseCommand("/start@my_bot t_abc")).toEqual({
      kind: "start",
      target: { kind: "tutor", code: "abc" },
    });
  });
  it("parses /stop", () => {
    expect(parseCommand("/stop")).toEqual({ kind: "stop" });
  });
});

describe("tutorStartPayload round-trip", () => {
  it("prefixes a code that parses back to the same tutor code", () => {
    const code = "deadbeef";
    expect(parseStartPayload(tutorStartPayload(code))).toEqual({ kind: "tutor", code });
  });
});

describe("generateTutorLinkCode", () => {
  it("is a 32-char hex string (Telegram + URL safe)", () => {
    expect(generateTutorLinkCode()).toMatch(/^[a-f0-9]{32}$/);
  });
  it("is unguessable (two codes differ)", () => {
    expect(generateTutorLinkCode()).not.toBe(generateTutorLinkCode());
  });
});

describe("buildBotDeepLink", () => {
  it("builds a t.me start link", () => {
    expect(buildBotDeepLink("tutoros_bot", "t_abc")).toBe("https://t.me/tutoros_bot?start=t_abc");
  });
});
