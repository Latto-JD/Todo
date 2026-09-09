/**
 * Tiny local date helpers for the dashboard period pickers.
 *
 * Lives here (not `lib/date.ts`) to stay clear of concurrent edits by other
 * agents — see progress.txt. Each function returns `{ start, end }` as
 * `YYYY-MM-DD` strings, ready for `<input type="date">` and the `from`/`to`
 * list-query params (the API coerces them with `z.coerce.date()`).
 */

export interface DateRange {
  start: string;
  end: string;
}

const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

/** Monday–Sunday of the week containing `now` (ISO-8601 week, Monday start). */
export function currentIsoWeekRange(now: Date = new Date()): DateRange {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayFromMonday = (base.getDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0
  const monday = new Date(base);
  monday.setDate(base.getDate() - dayFromMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: ymd(monday), end: ymd(sunday) };
}

/** First to last day of the month containing `now`. */
export function currentMonthRange(now: Date = new Date()): DateRange {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: ymd(start), end: ymd(end) };
}

/** Jan 1 to Dec 31 of the year containing `now`. */
export function currentYearRange(now: Date = new Date()): DateRange {
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);
  return { start: ymd(start), end: ymd(end) };
}
