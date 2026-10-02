/**
 * Cart shapes shared by the client (cart provider, cart page) and the server (cart data
 * access, server actions).
 *
 * Pure types only — importing this module must never pull a database driver into the
 * browser bundle.
 */

export type CartLine = {
  /** Empty string for guest (browser-local) lines that have no database row yet. */
  cartItemId: string;
  serviceId: string;
  quantity: number;
  serviceName: string;
  serviceSlug: string;
  imageUrl: string | null;
  /** Current price from the database, integer naira. */
  unitPrice: number;
  /** `unitPrice * quantity`. */
  lineTotal: number;
};

export type CartTotalsView = {
  subtotal: number;
  deliveryFee: number;
  total: number;
};

export type CartSnapshotView = {
  lines: CartLine[];
  totals: CartTotalsView;
  /** Sum of quantities (number of garments). */
  itemCount: number;
};

export type CartActionFailure = {
  ok: false;
  error: string;
  code: "UNAUTHENTICATED" | "INVALID_INPUT" | "UNKNOWN";
};

export type CartActionResult =
  | { ok: true; cart: CartSnapshotView }
  | CartActionFailure;

/** The input shape of a guest cart entry — prices are never stored client-side. */
export type GuestCartEntry = {
  serviceId: string;
  quantity: number;
};

/** Price information the client needs to render a guest cart (always fetched from the API). */
export type ServicePriceView = {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string | null;
};