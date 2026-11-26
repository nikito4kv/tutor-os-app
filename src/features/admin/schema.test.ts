import { describe, expect, it } from "vitest";
import { FEEDBACK_STATUSES, parseFeedbackFilter, parseFeedbackStatusForm } from "./schema";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("parseFeedbackFilter", () => {
  it("passes through a known status filter", () => {
    expect(parseFeedbackFilter("new")).toBe("new");
    expect(parseFeedbackFilter("seen")).toBe("seen");
    expect(parseFeedbackFilter("closed")).toBe("closed");
    expect(parseFeedbackFilter("all")).toBe("all");
  });

  it("falls back to 'all' on missing or unknown values", () => {
    expect(parseFeedbackFilter(undefined)).toBe("all");
    expect(parseFeedbackFilter("")).toBe("all");
    expect(parseFeedbackFilter("nope")).toBe("all");
  });
});

describe("parseFeedbackStatusForm", () => {
  it("accepts each known status", () => {
    for (const status of FEEDBACK_STATUSES) {
      const r = parseFeedbackStatusForm(form({ status }));
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.status).toBe(status);
    }
  });

  it("rejects an empty or unknown status", () => {
    expect(parseFeedbackStatusForm(form({})).success).toBe(false);
    expect(parseFeedbackStatusForm(form({ status: "spam" })).success).toBe(false);
  });
});
