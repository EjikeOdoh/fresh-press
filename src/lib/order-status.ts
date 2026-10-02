/**
 * Order status vocabulary, labels and presentation helpers.
 *
 * This module is deliberately dependency-free so it can be imported by both client and
 * server components, and by the Drizzle schema (which builds a `pg_enum` from
 * `ORDER_STATUS_VALUES`). It is the single source of truth for order statuses.
 */

export const ORDER_STATUS_VALUES = [
  "PENDING",
  "CONFIRMED",
  "PICKED_UP",
  "CLEANING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUS_VALUES)[number];

export type OrderStatusMeta = {
  value: OrderStatusValue;
  label: string;
  description: string;
  /** Tailwind classes for the status badge (static strings so they are compiled). */
  badgeClass: string;
  /** Position in the happy-path timeline; `null` for terminal exceptions. */
  step: number | null;
};

export const ORDER_STATUSES: readonly OrderStatusMeta[] = [
  {
    value: "PENDING",
    label: "Pending",
    description: "We have received your order and are waiting to confirm pickup.",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-200",
    step: 0,
  },
  {
    value: "CONFIRMED",
    label: "Confirmed",
    description: "Your pickup has been confirmed by our team.",
    badgeClass: "bg-sky-100 text-sky-900 border-sky-200",
    step: 1,
  },
  {
    value: "PICKED_UP",
    label: "Picked up",
    description: "Your items have been collected and are on the way to our facility.",
    badgeClass: "bg-indigo-100 text-indigo-900 border-indigo-200",
    step: 2,
  },
  {
    value: "CLEANING",
    label: "Cleaning",
    description: "Your items are being professionally cleaned and pressed.",
    badgeClass: "bg-violet-100 text-violet-900 border-violet-200",
    step: 3,
  },
  {
    value: "READY",
    label: "Ready",
    description: "Cleaning is complete — your items are quality-checked and packed.",
    badgeClass: "bg-teal-100 text-teal-900 border-teal-200",
    step: 4,
  },
  {
    value: "OUT_FOR_DELIVERY",
    label: "Out for delivery",
    description: "Our courier is on the way to your delivery address.",
    badgeClass: "bg-cyan-100 text-cyan-900 border-cyan-200",
    step: 5,
  },
  {
    value: "DELIVERED",
    label: "Delivered",
    description: "Your order has been delivered. Thank you for choosing FreshPress!",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-200",
    step: 6,
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    description: "This order was cancelled. Contact us if you need it reinstated.",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-200",
    step: null,
  },
];

/** The normal progression of an order (excludes the `CANCELLED` exception). */
export const ORDER_FLOW: readonly OrderStatusValue[] = ORDER_STATUSES.filter(
  (status) => status.step !== null,
).map((status) => status.value);

const FALLBACK_STATUS: OrderStatusMeta = ORDER_STATUSES[0];

export function isOrderStatus(value: unknown): value is OrderStatusValue {
  return (
    typeof value === "string" &&
    (ORDER_STATUS_VALUES as readonly string[]).includes(value)
  );
}

export function getOrderStatus(value: string): OrderStatusMeta {
  return ORDER_STATUSES.find((status) => status.value === value) ?? FALLBACK_STATUS;
}

export function getOrderStatusLabel(value: string): string {
  return getOrderStatus(value).label;
}

export function getOrderStatusBadgeClass(value: string): string {
  return getOrderStatus(value).badgeClass;
}

export type TimelineStep = {
  value: OrderStatusValue;
  label: string;
  description: string;
  state: "complete" | "current" | "upcoming" | "skipped";
};

/**
 * Build the status timeline for an order. Cancelled orders show the flow as skipped
 * followed by a single cancelled step so the customer can see where it stopped.
 */
export function getOrderTimeline(status: string): TimelineStep[] {
  const current = getOrderStatus(status);

  if (current.value === "CANCELLED") {
    return [
      ...ORDER_FLOW.map((value) => {
        const meta = getOrderStatus(value);
        return {
          value,
          label: meta.label,
          description: meta.description,
          state: "skipped" as const,
        };
      }),
      {
        value: current.value,
        label: current.label,
        description: current.description,
        state: "current" as const,
      },
    ];
  }

  const currentStep = current.step ?? 0;

  return ORDER_FLOW.map((value) => {
    const meta = getOrderStatus(value);
    const step = meta.step ?? 0;
    return {
      value,
      label: meta.label,
      description: meta.description,
      state:
        step < currentStep ? "complete" : step === currentStep ? "current" : "upcoming",
    };
  });
}