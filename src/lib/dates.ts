/**
 * Date helpers for pickup/delivery scheduling and order display.
 *
 * Pickup and delivery dates are stored as PostgreSQL `date` (no time component) and are
 * handled as `YYYY-MM-DD` strings end to end, which removes every timezone trap.
 */

const longDateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

/** Today's date (or `now`'s date) as `YYYY-MM-DD` in local time. */
export function toDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** `YYYY-MM-DD` string for the day after `isoDate`. */
export function addDaysToDateInputValue(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isValidDateInputValue(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** e.g. `"Fri, 2 October 2026"`. Safe for both `Date` and `YYYY-MM-DD` strings. */
export function formatOrderDate(value: Date | string): string {
  const date = typeof value === "string" ? parseDateValue(value) : value;
  return longDateFormatter.format(date);
}

/** e.g. `"02 Oct 2026, 14:05"` — used for timestamps such as `createdAt`. */
export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return shortDateTimeFormatter.format(date);
}

function parseDateValue(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}