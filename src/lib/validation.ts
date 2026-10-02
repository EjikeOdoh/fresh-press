import { z } from "zod";

import { CHECKOUT_LIMITS, TIME_SLOT_VALUES } from "./config";
import { addDaysToDateInputValue, isValidDateInputValue, toDateInputValue } from "./dates";

/**
 * Every rule below is enforced twice: in the browser (for immediate feedback) and on the
 * server (as the authority). The server never trusts anything else from the client.
 *
 * NOTE: The checkout schema deliberately contains **no** price, subtotal, delivery fee or
 * total field. Money is always derived on the server from database prices.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const idSchema = z
  .string()
  .trim()
  .regex(UUID_PATTERN, "Invalid identifier");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Enter your email address")
  .max(254, "Email address is too long")
  .regex(
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    "Enter a valid email address, e.g. you@example.com",
  );

/** Nigerian-friendly phone numbers: `+234…`, `234…`, `0…`, with optional spaces/dashes. */
const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter your phone number")
  .max(20, "Phone number is too long")
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .refine((value) => /^\+?\d{10,15}$/.test(value), {
    message: "Enter a valid phone number, e.g. 0801 234 5678 or +2348012345678",
  });

const addressSchema = z
  .string()
  .trim()
  .min(5, "Enter a full address (at least 5 characters)")
  .max(CHECKOUT_LIMITS.maxAddressLength, "Address is too long");

const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name")
  .max(120, "Name is too long");

const dateSchema = z
  .string()
  .trim()
  .refine(isValidDateInputValue, { message: "Enter a valid date" });

const timeSlotSchema = z.enum(TIME_SLOT_VALUES);

/** Fields shared by checkout and by anybody validating an order payload. */
export const checkoutFieldsSchema = z.object({
  customerName: nameSchema,
  customerEmail: emailSchema,
  customerPhone: phoneSchema,
  pickupAddress: addressSchema,
  pickupDate: dateSchema,
  pickupTimeSlot: timeSlotSchema,
  deliveryAddress: addressSchema,
  deliveryDate: dateSchema,
  deliveryTimeSlot: timeSlotSchema,
  specialInstructions: z
    .string()
    .trim()
    .max(CHECKOUT_LIMITS.maxInstructionsLength, "Special instructions are too long")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type CheckoutFields = z.infer<typeof checkoutFieldsSchema>;

/**
 * Full checkout schema.
 *
 * `today` is injectable so date rules are deterministic in tests.
 */
export function createCheckoutSchema(today: string = toDateInputValue()) {
  const latestAllowed = addDaysToDateInputValue(today, CHECKOUT_LIMITS.maxDaysAhead);

  return checkoutFieldsSchema.superRefine((value, ctx) => {
    if (isValidDateInputValue(value.pickupDate)) {
      if (value.pickupDate < today) {
        ctx.addIssue({
          code: "custom",
          path: ["pickupDate"],
          message: "Pickup date cannot be in the past",
        });
      } else if (value.pickupDate > latestAllowed) {
        ctx.addIssue({
          code: "custom",
          path: ["pickupDate"],
          message: `Pickup date cannot be more than ${CHECKOUT_LIMITS.maxDaysAhead} days away`,
        });
      }
    }

    if (isValidDateInputValue(value.deliveryDate)) {
      if (value.deliveryDate < today) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryDate"],
          message: "Delivery date cannot be in the past",
        });
      } else if (value.deliveryDate > latestAllowed) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryDate"],
          message: `Delivery date cannot be more than ${CHECKOUT_LIMITS.maxDaysAhead} days away`,
        });
      } else if (
        isValidDateInputValue(value.pickupDate) &&
        value.deliveryDate < value.pickupDate
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryDate"],
          message: "Delivery date must be on or after the pickup date",
        });
      }
    }
  });
}

export const checkoutSchema = createCheckoutSchema();

export const cartItemInputSchema = z.object({
  serviceId: idSchema,
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(99, "Quantity cannot be more than 99"),
});

export const guestCartSchema = z
  .array(cartItemInputSchema)
  .max(30, "Too many different items in the cart");

export type GuestCartItem = z.infer<typeof cartItemInputSchema>;