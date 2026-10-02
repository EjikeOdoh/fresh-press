import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Relative imports (not `@/` aliases) so drizzle-kit can bundle this file reliably.
import { TIME_SLOT_VALUES } from "../../lib/config";
import { ORDER_STATUS_VALUES } from "../../lib/order-status";
import { user } from "./auth";

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

export const orderStatusEnum = pgEnum("order_status", ORDER_STATUS_VALUES);
export const timeSlotEnum = pgEnum("time_slot", TIME_SLOT_VALUES);

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();

const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

/* -------------------------------------------------------------------------- */
/* service_categories                                                          */
/* -------------------------------------------------------------------------- */

export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  createdAt,
  updatedAt,
});

/* -------------------------------------------------------------------------- */
/* services                                                                    */
/* -------------------------------------------------------------------------- */

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => serviceCategories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    /** Integer naira. Never a float, never a string. */
    price: integer("price").notNull(),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("services_category_id_idx").on(table.categoryId),
    check("services_price_positive", sql`${table.price} > 0`),
  ],
);

/* -------------------------------------------------------------------------- */
/* carts                                                                       */
/* -------------------------------------------------------------------------- */

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** One persistent cart per Better Auth user. */
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt,
  updatedAt,
});

/* -------------------------------------------------------------------------- */
/* cart_items                                                                  */
/* -------------------------------------------------------------------------- */

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    // Adding the same service twice merges quantities instead of duplicating rows.
    unique("cart_items_cart_id_service_id_unique").on(
      table.cartId,
      table.serviceId,
    ),
    index("cart_items_cart_id_idx").on(table.cartId),
    check(
      "cart_items_quantity_valid",
      sql`${table.quantity} > 0 and ${table.quantity} <= 99`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* orders                                                                      */
/* -------------------------------------------------------------------------- */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human readable and unique: FP-YYYYMMDD-NNN */
    orderNumber: text("order_number").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone").notNull(),
    pickupAddress: text("pickup_address").notNull(),
    pickupDate: date("pickup_date", { mode: "string" }).notNull(),
    pickupTimeSlot: timeSlotEnum("pickup_time_slot").notNull(),
    deliveryAddress: text("delivery_address").notNull(),
    deliveryDate: date("delivery_date", { mode: "string" }).notNull(),
    deliveryTimeSlot: timeSlotEnum("delivery_time_slot").notNull(),
    specialInstructions: text("special_instructions"),
    /** All amounts are integer naira. */
    subtotal: integer("subtotal").notNull(),
    deliveryFee: integer("delivery_fee").notNull(),
    total: integer("total").notNull(),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    confirmationEmailSentAt: timestamp("confirmation_email_sent_at", {
      withTimezone: true,
    }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("orders_user_id_idx").on(table.userId),
    index("orders_created_at_idx").on(table.createdAt),
    index("orders_confirmation_email_sent_at_idx").on(
      table.confirmationEmailSentAt,
    ),
    check(
      "orders_amounts_non_negative",
      sql`${table.subtotal} >= 0 and ${table.deliveryFee} >= 0 and ${table.total} >= 0`,
    ),
    check(
      "orders_total_matches_parts",
      sql`${table.total} = ${table.subtotal} + ${table.deliveryFee}`,
    ),
    check(
      "orders_delivery_not_before_pickup",
      sql`${table.deliveryDate} >= ${table.pickupDate}`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* order_items                                                                 */
/* -------------------------------------------------------------------------- */

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /**
     * Nullable + `set null` so removing a service from the catalogue can never destroy
     * or break historical orders.
     */
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    /** Historical snapshot — an old order must not change when a service is re-priced. */
    serviceName: text("service_name").notNull(),
    /** Historical snapshot, integer naira. */
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "order_items_line_total_matches",
      sql`${table.lineTotal} = ${table.unitPrice} * ${table.quantity}`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Inferred types                                                              */
/* -------------------------------------------------------------------------- */

export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type NewOrderItem = typeof orderItems.$inferInsert;