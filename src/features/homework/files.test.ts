import { describe, expect, it } from "vitest";
import { collectHomeworkPaths, resolveSignedUrl } from "./files";

describe("collectHomeworkPaths", () => {
  it("collects both file fields, drops nulls, and dedupes", () => {
    const rows = [
      { attachment_url: "a", submission_url: null },
      { attachment_url: "a", submission_url: "b" },
      { attachment_url: null, submission_url: null },
    ];
    expect(collectHomeworkPaths(rows)).toEqual(["a", "b"]);
  });

  it("returns no paths for an empty set", () => {
    expect(collectHomeworkPaths([])).toEqual([]);
  });

  it("returns no paths when every row is fileless", () => {
    expect(collectHomeworkPaths([{ attachment_url: null, submission_url: null }])).toEqual([]);
  });
});

describe("resolveSignedUrl", () => {
  const map = new Map<string, string>([["a", "https://signed/a"]]);

  it("resolves a present path", () => {
    expect(resolveSignedUrl(map, "a")).toBe("https://signed/a");
  });

  it("returns null for a path absent from the map (e.g. per-file sign failure)", () => {
    expect(resolveSignedUrl(map, "x")).toBeNull();
  });

  it("returns null for a null path", () => {
    expect(resolveSignedUrl(map, null)).toBeNull();
  });
});
