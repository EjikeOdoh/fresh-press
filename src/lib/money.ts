/**
 * Money helpers.
 *
 * Every monetary amount in this project is an **integer number of naira**. There is no
 * sub-unit arithmetic, no rounding drift and no floating point arithmetic anywhere.
 */

const nairaNumberFormatter = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format an integer naira amount for display, e.g. `1000` -> `"₦1,000"`. */
export function formatNaira(amountInNaira: number): string {
  const safeAmount = Number.isFinite(amountInNaira) ? Math.round(amountInNaira) : 0;
  return `₦${nairaNumberFormatter.format(safeAmount)}`;
}

/** A line that has a unit price and a quantity. */
export type PricedLine = {
  unitPrice: number;
  quantity: number;
};

/** `unitPrice * quantity` — integer multiplication only. */
export function calculateLineTotal({ unitPrice, quantity }: PricedLine): number {
  return unitPrice * quantity;
}

/** Sum of every line total. */
export function calculateSubtotal(lines: readonly PricedLine[]): number {
  return lines.reduce((subtotal, line) => subtotal + calculateLineTotal(line), 0);
}

export type OrderTotals = {
  subtotal: number;
  deliveryFee: number;
  total: number;
};

/**
 * The single place where an order's money is derived. The server always calls this with
 * database prices, never with anything that came from the browser.
 */
export function calculateOrderTotals(
  lines: readonly PricedLine[],
  deliveryFee: number,
): OrderTotals {
  const subtotal = calculateSubtotal(lines);
  return {
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
  };
}