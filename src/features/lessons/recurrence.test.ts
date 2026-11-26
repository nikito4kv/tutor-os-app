import { describe, expect, it } from "vitest";

// recurrence.ts is server-only; vitest.config aliases that marker to a stub so it
// can be imported here and its pure expansion logic unit-tested.
import {
  buildRule,
  buildSeriesPayload,
  expandOccurrences,
  ruleToStored,
  type RecurrencePlan,
  type RecurrenceSpec,
} from "./recurrence";
import { MAX_RECURRENCE_OCCURRENCES } from "@/lib/constants";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tue 9 Jun 2026 18:00 local, weekly, 4 times — overridable per test. */
function spec(overrides: Partial<RecurrenceSpec> = {}): RecurrenceSpec {
  return {
    dtstart: new Date(2026, 5, 9, 18, 0),
    interval: 1,
    weekdays: [],
    end: { kind: "count", count: 4 },
    ...overrides,
  };
}

describe("expandOccurrences", () => {
  it("expands a weekly COUNT series on the dtstart's own weekday", () => {
    const dates = expandOccurrences(spec());
    expect(dates).toHaveLength(4);
    // Same wall-clock time every week (timezone-independent reconstruction).
    for (const d of dates) {
      expect(d.getDay()).toBe(2); // Tuesday
      expect(d.getHours()).toBe(18);
      expect(d.getMinutes()).toBe(0);
    }
    expect(dates[0]?.getTime()).toBe(spec().dtstart.getTime());
    expect(dates[1]!.getTime() - dates[0]!.getTime()).toBe(7 * DAY_MS);
  });

  it("honours interval=2 (every two weeks)", () => {
    const dates = expandOccurrences(spec({ interval: 2, end: { kind: "count", count: 3 } }));
    expect(dates).toHaveLength(3);
    expect(dates[1]!.getTime() - dates[0]!.getTime()).toBe(14 * DAY_MS);
    expect(dates[2]!.getTime() - dates[1]!.getTime()).toBe(14 * DAY_MS);
  });

  it("caps a runaway COUNT at MAX_RECURRENCE_OCCURRENCES", () => {
    const dates = expandOccurrences(spec({ end: { kind: "count", count: 1000 } }));
    expect(dates).toHaveLength(MAX_RECURRENCE_OCCURRENCES);
  });

  it("caps a far-future UNTIL at MAX_RECURRENCE_OCCURRENCES", () => {
    const dates = expandOccurrences(spec({ end: { kind: "until", until: new Date(2099, 0, 1) } }));
    expect(dates).toHaveLength(MAX_RECURRENCE_OCCURRENCES);
  });

  it("returns an empty set when UNTIL is before dtstart", () => {
    const dates = expandOccurrences(spec({ end: { kind: "until", until: new Date(2026, 0, 1) } }));
    expect(dates).toHaveLength(0);
  });

  it("bounds a UNTIL series to occurrences on/before the end date", () => {
    // Tuesdays from 9 Jun up to 1 Jul 2026 → 9, 16, 23, 30 Jun.
    const dates = expandOccurrences(spec({ end: { kind: "until", until: new Date(2026, 6, 1) } }));
    expect(dates).toHaveLength(4);
    expect(dates.every((d) => d.getDay() === 2)).toBe(true);
  });

  it("uses explicit weekdays when provided (Mon-based index)", () => {
    // weekdays [0] = Monday, even though dtstart is a Tuesday.
    const dates = expandOccurrences(spec({ weekdays: [0], end: { kind: "count", count: 2 } }));
    expect(dates).toHaveLength(2);
    expect(dates.every((d) => d.getDay() === 1)).toBe(true); // Monday
  });
});

describe("ruleToStored", () => {
  it("stores the RRULE pattern without the RRULE: prefix or a DTSTART line", () => {
    const stored = ruleToStored(buildRule(spec()));
    expect(stored).toMatch(/FREQ=WEEKLY/);
    expect(stored).toMatch(/COUNT=4/);
    expect(stored).not.toMatch(/^RRULE:/);
    expect(stored).not.toMatch(/DTSTART/);
  });
});

describe("buildSeriesPayload", () => {
  function plan(overrides: Partial<RecurrenceSpec> = {}, durationMin = 60): RecurrencePlan {
    const s = spec(overrides);
    return { spec: s, duration_min: durationMin, occurrences: expandOccurrences(s) };
  }

  it("maps one plan to one payload item (ISO dates, rrule, shared meta)", () => {
    const payload = buildSeriesPayload([plan({ end: { kind: "count", count: 3 } }, 90)], {
      topic: "Алгебра",
      note: "Глава 4",
      color: "violet",
    });
    expect(payload).toHaveLength(1);
    const item = payload[0]!;
    expect(item.occurrences).toHaveLength(3);
    expect(item.occurrences.every((iso) => !Number.isNaN(Date.parse(iso)))).toBe(true);
    expect(item.dtstart).toBe(spec().dtstart.toISOString());
    expect(item.duration_min).toBe(90);
    expect(item.rrule).toMatch(/FREQ=WEEKLY/);
    expect(item.topic).toBe("Алгебра");
    expect(item.note).toBe("Глава 4");
    expect(item.color).toBe("violet");
  });

  it("produces one item per plan (multi-weekday)", () => {
    const mon = plan({ weekdays: [0], end: { kind: "count", count: 2 } });
    const thu = plan({ weekdays: [3], end: { kind: "count", count: 2 } });
    const payload = buildSeriesPayload([mon, thu], { topic: null, note: null, color: null });
    expect(payload).toHaveLength(2);
    expect(payload[0]!.occurrences).toHaveLength(2);
    expect(payload[1]!.occurrences).toHaveLength(2);
  });

  it("returns an empty payload for no plans", () => {
    expect(buildSeriesPayload([], { topic: null, note: null, color: null })).toHaveLength(0);
  });
});
