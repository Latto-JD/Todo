import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentIsoWeekRange,
  currentMonthRange,
  currentYearRange,
} from "@/app/dashboard/_lib/date";

/**
 * Unit tests for the dashboard period helpers (criterion 22 names `lib/date.ts`
 * explicitly; the helpers live at `app/dashboard/_lib/date.ts` — see progress.txt).
 *
 * Every case pins a fixed local wall clock with `vi.setSystemTime` so the
 * default-argument path (`now = new Date()`) is what is under test.
 */

afterEach(() => {
  vi.useRealTimers();
});

describe("currentIsoWeekRange (Monday-start ISO week)", () => {
  const cases = [
    // A Wednesday — middle of the week.
    { label: "Wednesday", clock: new Date(2026, 8, 9, 12, 0, 0) },
    // A Sunday — exercises the `(getDay() + 6) % 7` wrap (Sun=0 -> 6).
    { label: "Sunday", clock: new Date(2026, 8, 13, 23, 30, 0) },
    // A Monday — the week's own start (wrap gives 0).
    { label: "Monday", clock: new Date(2026, 8, 7, 0, 30, 0) },
  ];

  for (const { label, clock } of cases) {
    it(`${label} resolves to Mon 2026-09-07 .. Sun 2026-09-13`, () => {
      vi.useFakeTimers();
      vi.setSystemTime(clock);
      const { start, end } = currentIsoWeekRange();
      expect(start).toBe("2026-09-07");
      expect(end).toBe("2026-09-13");
      expect(start <= end).toBe(true);
    });
  }

  it("spans exactly 6 days (Mon..Sun)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 9, 12, 0, 0));
    const { start, end } = currentIsoWeekRange();
    const days = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000;
    expect(days).toBe(6);
  });

  it("handles a week that crosses a month boundary", () => {
    vi.useFakeTimers();
    // Wednesday 2026-04-01 -> week is Mon 2026-03-30 .. Sun 2026-04-05.
    vi.setSystemTime(new Date(2026, 3, 1, 9, 0, 0));
    expect(currentIsoWeekRange()).toEqual({ start: "2026-03-30", end: "2026-04-05" });
  });
});

describe("currentMonthRange (first..last day of month)", () => {
  it("a 31-day month (September 2026)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 12, 0, 0));
    expect(currentMonthRange()).toEqual({ start: "2026-09-01", end: "2026-09-30" });
  });

  it("February 2026 has 28 days (not a leap year)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 15, 12, 0, 0));
    expect(currentMonthRange()).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });

  it("December rolls the year correctly for the last day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 15, 12, 0, 0));
    expect(currentMonthRange()).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });

  it("January picks up the first day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0));
    expect(currentMonthRange()).toEqual({ start: "2026-01-01", end: "2026-01-31" });
  });
});

describe("currentYearRange", () => {
  it("Jan 1 .. Dec 31 of the current year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
    expect(currentYearRange()).toEqual({ start: "2026-01-01", end: "2026-12-31" });
  });

  it("is stable on the year's first instant", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2027, 0, 1, 0, 0, 0));
    expect(currentYearRange()).toEqual({ start: "2027-01-01", end: "2027-12-31" });
  });
});
