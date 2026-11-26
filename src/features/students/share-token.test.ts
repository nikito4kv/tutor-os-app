import { describe, expect, it } from "vitest";
import { buildShareToken, readablePartOf, slugify } from "./share-token";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Nikita Math")).toBe("nikita-math");
  });
  it("treats underscores/spaces as separators and trims", () => {
    expect(slugify(" a__b ")).toBe("a-b");
  });
  it("drops non-latin (Cyrillic) characters", () => {
    expect(slugify("Иван")).toBe("");
  });
  it("collapses repeated hyphens", () => {
    expect(slugify("a---b")).toBe("a-b");
  });
  it("trims edge hyphens", () => {
    expect(slugify("-x-")).toBe("x");
  });
});

describe("readablePartOf", () => {
  it("returns empty for a hyphen-free (legacy/random) token", () => {
    expect(readablePartOf("00112233445566778899aabbccddeeff")).toBe("");
  });
  it("strips the trailing random suffix", () => {
    expect(readablePartOf("nikita-math-7f3a8b2c")).toBe("nikita-math");
  });
  it("keeps internal hyphens of the readable part", () => {
    expect(readablePartOf("a-b-c-sfx")).toBe("a-b-c");
  });
  it("returns empty for a bare word", () => {
    expect(readablePartOf("noHyphen")).toBe("");
  });
});

describe("buildShareToken", () => {
  it("returns null for blank / unusable input", () => {
    expect(buildShareToken("")).toBeNull();
    expect(buildShareToken(undefined)).toBeNull();
    expect(buildShareToken("Иван")).toBeNull();
  });
  it("produces <slug>-<suffix> that round-trips through readablePartOf", () => {
    const token = buildShareToken("Nikita Math");
    expect(token).not.toBeNull();
    expect(token).toMatch(/^[a-z0-9-]+-[a-z0-9]+$/);
    expect(readablePartOf(token as string)).toBe("nikita-math");
  });
});
