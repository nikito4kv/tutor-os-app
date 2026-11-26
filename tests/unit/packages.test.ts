import { describe, it, expect } from "vitest";
import { parsePackageForm } from "@/features/packages/schema";
import { packageBalance } from "@/features/packages/balance";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("parsePackageForm", () => {
  it("accepts a positive integer lesson count with a blank price", () => {
    const r = parsePackageForm(form({ total_lessons: "8", price: "" }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.total_lessons).toBe(8);
      expect(r.data.price).toBeNull();
    }
  });

  it("parses a price when provided", () => {
    const r = parsePackageForm(form({ total_lessons: "4", price: "1500" }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.price).toBe(1500);
  });

  it("rejects zero, negative, and non-integer lesson counts", () => {
    expect(parsePackageForm(form({ total_lessons: "0", price: "" })).success).toBe(false);
    expect(parsePackageForm(form({ total_lessons: "-1", price: "" })).success).toBe(false);
    expect(parsePackageForm(form({ total_lessons: "2.5", price: "" })).success).toBe(false);
    expect(parsePackageForm(form({ total_lessons: "abc", price: "" })).success).toBe(false);
  });

  it("rejects a negative price", () => {
    expect(parsePackageForm(form({ total_lessons: "8", price: "-1" })).success).toBe(false);
  });
});

describe("packageBalance", () => {
  it("sums remaining lessons across packages", () => {
    expect(packageBalance([])).toBe(0);
    expect(packageBalance([{ lessons_left: 3 }, { lessons_left: 2 }])).toBe(5);
  });
});
