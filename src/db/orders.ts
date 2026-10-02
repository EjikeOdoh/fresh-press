import { and, asc, count, desc, eq, gte, like, sql } from "drizzle-orm";

import { DELIVERY_FEE_NAIRA } from "../lib/config";
import { calculateLineTotal, calculateOrderTotals } from "../lib/money";
import {
  buildOrderNumber,
  buildOrderNumberWithRandomSuffix,
  isSequenceExhausted,
  isUniqueViolation,
  orderNumberDayPattern,
} from "../lib/order-number";
import type { CheckoutFields } from "../lib/validation";
import { getDb, type Database } from "./index";
import {
  cartItems,
  carts,
  orderItems,
  orders,
  services,
  type Order,
  type OrderItem,
} from "./schema";

/**
 * Order creation and reading.
 *
 * ## Security model
 *
 * `createOrder()` never reads a price, subtotal, delivery fee or total from its input. It
 * loads the cart from the database, loads the *current* service prices from the database,
 * recalculates everything, and writes the result in a single transaction together with the
 * order items and the cart clearing.
 *
 * `order_items.service_name` / `unit_price` are snapshots, so historic orders never change
 * when the catalogue changes.
 *
 * ## Duplicate submissions
 *
 * Two layers:
 * 1. The cart row is locked `FOR UPDATE`, which serialises concurrent checkouts for the
 *    same customer — a double click cannot create two orders.
 * 2. If a submission arrives when the cart is already empty and the customer ordered
 *    within `DUPLICATE_ORDER_WINDOW_MS`, the existing order is returned instead of an
 *    error, so retries/refreshes are idempotent.
 */

/** How long an empty cart still counts as "you just ordered" for retries. */
export const DUPLICATE_ORDER_WINDOW_MS = 10 * 60 * 1000;

const MAX_ORDER_NUMBER_ATTEMPTS = 5;

export type CreateOrderInput = CheckoutFields & {
  /** Taken from the Better Auth session on the server — never from the request body. */
  userId: string;
};

export type CreateOrderResult =
  | {
      status: "created";
      orderNumber: string;
      order: Order;
      items: OrderItem[];
    }
  | { status: "duplicate"; orderNumber: string }
  | { status: "empty-cart" };

/** A safe, client-presentable order failure. */
export class OrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderError";
  }
}

type PricedLine = {
  serviceId: string;
  serviceName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

/**
 * Create an order for `input.userId`.
 *
 * Retries the *whole* transaction on an order-number collision (a Postgres unique
 * violation aborts the transaction, so per-statement retries are not possible). Nothing is
 * committed until the transaction succeeds, which keeps retries safe.
 */
export async function createOrder(
  input: CreateOrderInput,
  db: Database = getDb(),
): Promise<CreateOrderResult> {
  const now = new Date();

  for (let attempt = 0; attempt < MAX_ORDER_NUMBER_ATTEMPTS; attempt += 1) {
    try {
      return await db.transaction(async (tx) =>
        attemptCreateOrder(tx as unknown as Database, input, now, attempt),
      );
    } catch (error) {
      const canRetry = isUniqueViolation(error) && attempt < MAX_ORDER_NUMBER_ATTEMPTS - 1;

      if (canRetry) {
        continue;
      }

      throw error;
    }
  }

  throw new OrderError(
    "We could not allocate an order number just now. Please try again.",
  );
}

async function attemptCreateOrder(
  db: Database,
  input: CreateOrderInput,
  now: Date,
  attempt: number,
): Promise<CreateOrderResult> {
  // Serialise concurrent checkouts for this customer (double clicks, retries).
  const cartId = await lockCartForUpdate(db, input.userId);

  if (!cartId) {
    return detectDuplicateOrEmptyCart(db, input.userId, now);
  }

  const lines = await loadPricedCartLines(db, cartId);

  if (lines.length === 0) {
    return detectDuplicateOrEmptyCart(db, input.userId, now);
  }

  const totals = calculateOrderTotals(lines, DELIVERY_FEE_NAIRA);
  const orderNumber = await nextOrderNumber(db, now, attempt);

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId: input.userId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      pickupAddress: input.pickupAddress,
      pickupDate: input.pickupDate,
      pickupTimeSlot: input.pickupTimeSlot,
      deliveryAddress: input.deliveryAddress,
      deliveryDate: input.deliveryDate,
      deliveryTimeSlot: input.deliveryTimeSlot,
      specialInstructions: input.specialInstructions ?? null,
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      status: "PENDING",
    })
    .returning();

  if (!order) {
    throw new OrderError("We could not save your order. Please try again.");
  }

  const items = await db
    .insert(orderItems)
    .values(
      lines.map((line) => ({
        orderId: order.id,
        serviceId: line.serviceId,
        serviceName: line.serviceName,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
    )
    .returning();

  // Clear the cart in the same transaction as the order.
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  await db.update(carts).set({ updatedAt: now }).where(eq(carts.id, cartId));

  return { status: "created", orderNumber: order.orderNumber, order, items };
}

/* -------------------------------------------------------------------------- */
/* Internal helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Lock the customer's cart row so two simultaneous checkouts cannot both succeed. */
async function lockCartForUpdate(
  db: Database,
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1)
    .for("update");

  return row?.id ?? null;
}

/** Load the cart's lines with **current** database prices. */
async function loadPricedCartLines(
  db: Database,
  cartId: string,
): Promise<PricedLine[]> {
  const rows = await db
    .select({
      serviceId: services.id,
      serviceName: services.name,
      unitPrice: services.price,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .innerJoin(services, eq(services.id, cartItems.serviceId))
    .where(and(eq(cartItems.cartId, cartId), eq(services.isActive, true)))
    .orderBy(asc(cartItems.createdAt));

  return rows.map((row) => ({
    ...row,
    lineTotal: calculateLineTotal(row),
  }));
}

async function countOrdersForDay(db: Database, now: Date): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(orders)
    .where(like(orders.orderNumber, orderNumberDayPattern(now)));

  return Number(row?.total ?? 0);
}

async function nextOrderNumber(
  db: Database,
  now: Date,
  attempt: number,
): Promise<string> {
  const sequence = (await countOrdersForDay(db, now)) + 1 + attempt;

  if (isSequenceExhausted(sequence)) {
    return buildOrderNumberWithRandomSuffix(now, sequence);
  }

  return buildOrderNumber(now, sequence);
}

async function detectDuplicateOrEmptyCart(
  db: Database,
  userId: string,
  now: Date,
): Promise<CreateOrderResult> {
  const [recent] = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        gte(orders.createdAt, new Date(now.getTime() - DUPLICATE_ORDER_WINDOW_MS)),
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(1);

  if (recent) {
    return { status: "duplicate", orderNumber: recent.orderNumber };
  }

  return { status: "empty-cart" };
}

/* -------------------------------------------------------------------------- */
/* Read helpers                                                                */
/* -------------------------------------------------------------------------- */

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  /** Integer naira. */
  total: number;
  createdAt: Date;
  pickupDate: string;
  deliveryDate: string;
  itemCount: number;
};

export type OrderWithItems = {
  order: Order;
  items: OrderItem[];
};

/** Order history for one customer (ownership is part of the query). */
export async function listOrdersForUser(
  userId: string,
  db: Database = getDb(),
): Promise<OrderSummary[]> {
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
      pickupDate: orders.pickupDate,
      deliveryDate: orders.deliveryDate,
      itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.userId, userId))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt));

  return rows.map((row) => ({ ...row, itemCount: Number(row.itemCount) }));
}

/**
 * A single order **belonging to `userId`**.
 *
 * The `user_id` filter is part of the SQL, so another customer's order number simply
 * resolves to `null` (the pages turn that into a 404). Route protection is never the only
 * defence.
 */
export async function getOrderForUser(
  userId: string,
  orderNumber: string,
  db: Database = getDb(),
): Promise<OrderWithItems | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.orderNumber, orderNumber)))
    .limit(1);

  if (!order) {
    return null;
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.serviceName));

  return { order, items };
}

export async function getOrderStatsForUser(
  userId: string,
  db: Database = getDb(),
): Promise<{ orderCount: number; totalSpend: number }> {
  const [row] = await db
    .select({
      orderCount: count(),
      totalSpend: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
    })
    .from(orders)
    .where(eq(orders.userId, userId));

  return {
    orderCount: Number(row?.orderCount ?? 0),
    totalSpend: Number(row?.totalSpend ?? 0),
  };
}

/** Record a successful confirmation email. Never part of the order transaction. */
export async function markConfirmationEmailSent(
  orderId: string,
  db: Database = getDb(),
): Promise<void> {
  await db
    .update(orders)
    .set({ confirmationEmailSentAt: new Date() })
    .where(eq(orders.id, orderId));
}