/**
 * Human-readable order numbers: `FP-YYYYMMDD-NNN` (for example `FP-20261002-001`).
 *
 * The date segment is UTC based so the numbering is deterministic in tests and identical
 * regardless of the server's timezone. Uniqueness never depends on the date alone: the
 * database enforces a unique constraint on `orders.order_number` and callers retry (see
 * `createOrder`), falling back to a random suffix if the day's 999-slot range is somehow
 * exhausted.
 */

export const ORDER_NUMBER_PREFIX = "FP";

const MAX_SEQUENCE = 999;

export function formatOrderDateSegment(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

export function buildOrderNumber(date: Date, sequence: number): string {
  const paddedSequence = String(Math.max(1, Math.trunc(sequence))).padStart(3, "0");
  return `${ORDER_NUMBER_PREFIX}-${formatOrderDateSegment(date)}-${paddedSequence}`;
}

/**
 * Fallback used only if every sequential candidate is taken (extremely unlikely).
 * Still readable, still unique, and still constrained by the database.
 */
export function buildOrderNumberWithRandomSuffix(
  date: Date,
  sequence: number,
): string {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${buildOrderNumber(date, sequence)}-${suffix}`;
}

export function isSequenceExhausted(sequence: number): boolean {
  return sequence > MAX_SEQUENCE;
}

/** The `LIKE` pattern used to count orders created on a given day. */
export function orderNumberDayPattern(date: Date): string {
  return `${ORDER_NUMBER_PREFIX}-${formatOrderDateSegment(date)}-%`;
}

type MaybePgError = {
  code?: unknown;
  cause?: unknown;
  message?: unknown;
};

/**
 * Detect a PostgreSQL unique-constraint violation (SQLSTATE `23505`), including errors
 * wrapped by Drizzle (`error.cause`).
 */
export function isUniqueViolation(error: unknown): boolean {
  const visited = new Set<unknown>();
  let current: unknown = error;

  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);

    const candidate = current as MaybePgError;

    if (candidate.code === "23505") {
      return true;
    }

    if (
      typeof candidate.message === "string" &&
      /duplicate key value violates unique constraint|unique constraint/i.test(
        candidate.message,
      )
    ) {
      return true;
    }

    current = candidate.cause;
  }

  return false;
}