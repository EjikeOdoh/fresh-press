import { and, asc, eq, notInArray, sql } from "drizzle-orm";

import { CART_LIMITS, DELIVERY_FEE_NAIRA } from "../lib/config";
import {
  calculateLineTotal,
  calculateOrderTotals,
} from "../lib/money";
import { getDb, type Database } from "./index";
import { cartItems, carts, services } from "./schema";
import { getActiveServicesByIds } from "./services";
import type { CartLine, CartSnapshotView } from "../lib/cart-types";

/**
 * Server-side cart data access.
 *
 * The cart belongs to a Better Auth user (`userId`), so a cart can only ever be read or
 * mutated for the signed-in user. Guest carts live in the browser (see
 * `CartProvider`) and are merged into this cart on sign-in.
 *
 * Prices are always read from `services`; quantities and item identity are the only
 * client-supplied values.
 */

export type { CartLine };

export type CartSnapshot = CartSnapshotView & {
  cartId: string | null;
};

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return CART_LIMITS.minQuantity;
  }

  return Math.min(
    Math.max(Math.trunc(quantity), CART_LIMITS.minQuantity),
    CART_LIMITS.maxQuantity,
  );
}

function toSnapshot(cartId: string | null, lines: CartLine[]): CartSnapshot {
  const normalizedLines = lines.filter((line) => line.quantity > 0);

  return {
    cartId,
    lines: normalizedLines,
    totals: calculateOrderTotals(normalizedLines, DELIVERY_FEE_NAIRA),
    itemCount: normalizedLines.reduce((total, line) => total + line.quantity, 0),
  };
}

export function emptyCartSnapshot(): CartSnapshot {
  return toSnapshot(null, []);
}

/** Find the user's cart id without creating one. */
export async function findCartId(
  userId: string,
  db: Database = getDb(),
): Promise<string | null> {
  const [row] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  return row?.id ?? null;
}

/** Find or create the user's cart. */
export async function ensureCartId(
  userId: string,
  db: Database = getDb(),
): Promise<string> {
  const existing = await findCartId(userId, db);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(carts)
    .values({ userId })
    .onConflictDoUpdate({ target: carts.userId, set: { updatedAt: new Date() } })
    .returning({ id: carts.id });

  if (!created) {
    throw new Error("Unable to create a cart for this customer");
  }

  return created.id;
}

/** The current cart, with database prices and server-computed totals. */
export async function getCartSnapshot(
  userId: string,
  db: Database = getDb(),
): Promise<CartSnapshot> {
  const rows = await db
    .select({
      cartItemId: cartItems.id,
      cartId: cartItems.cartId,
      serviceId: services.id,
      quantity: cartItems.quantity,
      serviceName: services.name,
      serviceSlug: services.slug,
      imageUrl: services.imageUrl,
      unitPrice: services.price,
    })
    .from(carts)
    .innerJoin(cartItems, eq(cartItems.cartId, carts.id))
    .innerJoin(services, eq(services.id, cartItems.serviceId))
    .where(and(eq(carts.userId, userId), eq(services.isActive, true)))
    .orderBy(asc(cartItems.createdAt));

  if (rows.length === 0) {
    return toSnapshot(await findCartId(userId, db), []);
  }

  const lines: CartLine[] = rows.map((row) => ({
    cartItemId: row.cartItemId,
    serviceId: row.serviceId,
    quantity: row.quantity,
    serviceName: row.serviceName,
    serviceSlug: row.serviceSlug,
    imageUrl: row.imageUrl,
    unitPrice: row.unitPrice,
    lineTotal: calculateLineTotal({
      unitPrice: row.unitPrice,
      quantity: row.quantity,
    }),
  }));

  return toSnapshot(rows[0]?.cartId ?? null, lines);
}

/** Number of garments in the cart — used by the navbar badge. */
export async function countCartItems(
  userId: string,
  db: Database = getDb(),
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${cartItems.quantity}), 0)::int`,
    })
    .from(carts)
    .innerJoin(cartItems, eq(cartItems.cartId, carts.id))
    .innerJoin(services, eq(services.id, cartItems.serviceId))
    .where(and(eq(carts.userId, userId), eq(services.isActive, true)));

  return Number(row?.total ?? 0);
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

/** A safe, client-presentable cart failure. */
export class CartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartError";
  }
}

async function assertServiceIsAvailable(
  serviceId: string,
  db: Database,
): Promise<void> {
  const [row] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.isActive, true)))
    .limit(1);

  if (!row) {
    throw new CartError("This service is no longer available.");
  }
}

const mergeQuantityOnConflict = (quantity: number) => ({
  quantity: sql`least(${cartItems.quantity} + ${quantity}, ${CART_LIMITS.maxQuantity})`,
  updatedAt: new Date(),
});

/** Add a service, merging quantities if the service is already in the cart. */
export async function addCartItem(
  userId: string,
  serviceId: string,
  quantity: number,
  db: Database = getDb(),
): Promise<CartSnapshot> {
  await assertServiceIsAvailable(serviceId, db);

  const cartId = await ensureCartId(userId, db);
  const safeQuantity = clampQuantity(quantity);

  await db
    .insert(cartItems)
    .values({ cartId, serviceId, quantity: safeQuantity })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.serviceId],
      set: mergeQuantityOnConflict(safeQuantity),
    });

  return getCartSnapshot(userId, db);
}

/** Set an exact quantity. A quantity of 0 (or less) removes the line. */
export async function setCartItemQuantity(
  userId: string,
  serviceId: string,
  quantity: number,
  db: Database = getDb(),
): Promise<CartSnapshot> {
  if (quantity <= 0) {
    return removeCartItem(userId, serviceId, db);
  }

  await assertServiceIsAvailable(serviceId, db);

  const cartId = await ensureCartId(userId, db);
  const safeQuantity = clampQuantity(quantity);

  await db
    .insert(cartItems)
    .values({ cartId, serviceId, quantity: safeQuantity })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.serviceId],
      set: { quantity: safeQuantity, updatedAt: new Date() },
    });

  return getCartSnapshot(userId, db);
}

export async function removeCartItem(
  userId: string,
  serviceId: string,
  db: Database = getDb(),
): Promise<CartSnapshot> {
  const cartId = await findCartId(userId, db);

  if (cartId) {
    await db
      .delete(cartItems)
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.serviceId, serviceId)),
      );
  }

  return getCartSnapshot(userId, db);
}

export async function clearCart(
  userId: string,
  db: Database = getDb(),
): Promise<void> {
  const cartId = await findCartId(userId, db);

  if (!cartId) {
    return;
  }

  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  await db
    .update(carts)
    .set({ updatedAt: new Date() })
    .where(eq(carts.id, cartId));
}

/**
 * Merge a guest cart (browser localStorage) into the user's persistent cart.
 *
 * Idempotent-friendly: quantities are summed and clamped, unknown/inactive services are
 * silently dropped, and the whole merge runs in one transaction so the cart can never be
 * left half-merged.
 */
export async function mergeGuestCart(
  userId: string,
  items: readonly { serviceId: string; quantity: number }[],
  db: Database = getDb(),
): Promise<CartSnapshot> {
  const requested = items.slice(0, CART_LIMITS.maxDistinctItems);

  if (requested.length === 0) {
    return getCartSnapshot(userId, db);
  }

  const availableServices = await getActiveServicesByIds(
    requested.map((item) => item.serviceId),
    db,
  );
  const availableIds = new Set(availableServices.map((service) => service.id));

  await db.transaction(async (tx) => {
    const transactionDb = tx as unknown as Database;
    const cartId = await ensureCartId(userId, transactionDb);

    for (const item of requested) {
      if (!availableIds.has(item.serviceId)) {
        continue;
      }

      const quantity = clampQuantity(item.quantity);

      await tx
        .insert(cartItems)
        .values({ cartId, serviceId: item.serviceId, quantity })
        .onConflictDoUpdate({
          target: [cartItems.cartId, cartItems.serviceId],
          set: mergeQuantityOnConflict(quantity),
        });
    }
  });

  return getCartSnapshot(userId, db);
}

/** Remove cart lines whose service is gone or inactive (keeps reads and writes consistent). */
export async function pruneUnavailableCartItems(
  userId: string,
  db: Database = getDb(),
): Promise<void> {
  const cartId = await findCartId(userId, db);

  if (!cartId) {
    return;
  }

  const activeServices = await db
    .select({ id: services.id })
    .from(services)
    .where(eq(services.isActive, true));

  const activeIds = activeServices.map((service) => service.id);

  if (activeIds.length === 0) {
    return;
  }

  await db
    .delete(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        notInArray(cartItems.serviceId, activeIds),
      ),
    );
}