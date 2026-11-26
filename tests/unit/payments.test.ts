import { describe, it, expect } from "vitest";
import { parsePaymentForm } from "@/features/payments/schema";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("parsePaymentForm", () => {
  it("accepts a positive amount with a date and blank note", () => {
    const r = parsePaymentForm(form({ amount: "1500", paid_at: "2026-06-10", note: "" }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.amount).toBe(1500);
      expect(r.data.paid_at.startsWith("2026-06-10")).toBe(true);
      expect(r.data.note).toBeNull();
    }
  });

  it("trims and keeps a non-empty note", () => {
    const r = parsePaymentForm(form({ amount: "1000", paid_at: "2026-06-10", note: " перевод " }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.note).toBe("перевод");
  });

  it("rejects missing, zero, and non-numeric amounts", () => {
    expect(parsePaymentForm(form({ amount: "", paid_at: "2026-06-10", note: "" })).success).toBe(
      false,
    );
    expect(parsePaymentForm(form({ amount: "0", paid_at: "2026-06-10", note: "" })).success).toBe(
      false,
    );
    expect(parsePaymentForm(form({ amount: "abc", paid_at: "2026-06-10", note: "" })).success).toBe(
      false,
    );
  });

  it("rejects an invalid date", () => {
    expect(parsePaymentForm(form({ amount: "1500", paid_at: "", note: "" })).success).toBe(false);
  });
});
