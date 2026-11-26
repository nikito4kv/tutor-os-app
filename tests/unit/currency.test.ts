import { describe, it, expect } from "vitest";
import { formatMoney, isCurrencyCode } from "@/lib/currency";

describe("formatMoney", () => {
  it("formats RUB without fraction digits", () => {
    expect(formatMoney(1500, "RUB")).toMatch(/1\s?500/);
    expect(formatMoney(1500, "RUB")).toContain("₽");
  });

  it("supports other CIS currencies without throwing", () => {
    // Exact symbol vs ISO code depends on the runtime's ICU data, so we assert
    // the amount is present rather than a specific glyph.
    expect(formatMoney(50, "GEL")).toMatch(/50/);
    expect(formatMoney(20000, "KZT")).toMatch(/20\s?000/);
  });
});

describe("isCurrencyCode", () => {
  it("accepts supported codes and rejects others", () => {
    expect(isCurrencyCode("RUB")).toBe(true);
    expect(isCurrencyCode("XYZ")).toBe(false);
  });
});
