/**
 * Shared, dependency-free application configuration.
 *
 * Anything that has a single "correct" value in this project lives here so it is never
 * duplicated across UI components, server code, emails or seed data.
 *
 * This module is safe to import from client components: it contains no secrets.
 */

export const SITE = {
  name: "FreshPress Dry Cleaners",
  shortName: "FreshPress",
  tagline: "Fresh Clothes. Fresh Confidence.",
  description:
    "FreshPress Dry Cleaners picks up, professionally cleans, presses and delivers your clothes across Lagos. Book dry cleaning, wash & fold, ironing and deep cleaning in minutes.",
  email: "hello@freshpress.example",
  phone: "+234 800 000 0000",
  phoneHref: "tel:+2348000000000",
  address: "14 Adeola Odeku Street, Victoria Island, Lagos, Nigeria",
  hours: "Monday – Saturday, 8:00 AM – 7:00 PM",
} as const;

/** Default delivery fee, in naira. Persisted per order in `orders.delivery_fee`. */
export const DELIVERY_FEE_NAIRA = 1000;

export type TimeSlotValue = "MORNING" | "AFTERNOON" | "EVENING";

/**
 * Declared as a literal tuple so it can be used directly by both `pgEnum()` and `z.enum()`.
 */
export const TIME_SLOT_VALUES = ["MORNING", "AFTERNOON", "EVENING"] as const;

export type TimeSlot = {
  value: TimeSlotValue;
  label: string;
  window: string;
};

export const TIME_SLOTS: ReadonlyArray<TimeSlot> = [
  { value: "MORNING", label: "Morning", window: "9:00 AM – 12:00 PM" },
  { value: "AFTERNOON", label: "Afternoon", window: "12:00 PM – 3:00 PM" },
  { value: "EVENING", label: "Evening", window: "3:00 PM – 6:00 PM" },
];

export function getTimeSlotLabel(value: TimeSlotValue): string {
  const slot = TIME_SLOTS.find((candidate) => candidate.value === value);
  return slot ? `${slot.label} (${slot.window})` : value;
}

export const CART_LIMITS = {
  minQuantity: 1,
  maxQuantity: 99,
  /** Guards against a pathological payload when merging a guest cart. */
  maxDistinctItems: 30,
} as const;

export const CHECKOUT_LIMITS = {
  /** Pickup/delivery can be scheduled at most this many days ahead. */
  maxDaysAhead: 90,
  maxAddressLength: 300,
  maxInstructionsLength: 500,
} as const;

/** Number of featured services shown on the home page. */
export const FEATURED_SERVICE_COUNT = 6;

/**
 * Public base URL of the application (metadata, sitemap, links inside emails).
 * Falls back to localhost so the app is usable before `.env` exists.
 */
export function getAppUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  return (configured ?? "http://localhost:3000").replace(/\/+$/, "");
}