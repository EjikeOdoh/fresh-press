"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createOrder, markConfirmationEmailSent, OrderError } from "@/db/orders";
import type { Order, OrderItem } from "@/db/schema/app";
import { getAppUrl } from "@/lib/config";
import { buildOrderConfirmationEmail } from "@/lib/email/order-confirmation";
import { sendEmail } from "@/lib/mailgun";
import { getSession } from "@/lib/session";
import { createCheckoutSchema } from "@/lib/validation";

/**
 * Place an order.
 *
 * ## Security
 *
 * The form only ever submits *customer details* — never a price, subtotal, delivery fee or
 * total. `createOrder()` loads the cart and the current prices from the database, recomputes
 * every amount and writes the order, the order items and the cart clearing in one
 * transaction.
 *
 * ## Duplicate submissions
 *
 * A repeated submission (double click, refresh, retry) resolves to the same order and
 * redirects to its confirmation page instead of creating a second order.
 *
 * ## Email
 *
 * The confirmation email is sent **after** the order has been committed by the database. If
 * Mailgun fails, the order is kept, the failure is logged, and
 * `confirmation_email_sent_at` stays `null`.
 */

export type CheckoutFieldErrors = Record<string, string>;

export type CheckoutActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: CheckoutFieldErrors };

export const INITIAL_CHECKOUT_STATE: CheckoutActionState = { status: "idle" };

function readCheckoutForm(formData: FormData) {
  const value = (key: string) => {
    const raw = formData.get(key);
    return typeof raw === "string" ? raw : "";
  };

  return {
    customerName: value("customerName"),
    customerEmail: value("customerEmail"),
    customerPhone: value("customerPhone"),
    pickupAddress: value("pickupAddress"),
    pickupDate: value("pickupDate"),
    pickupTimeSlot: value("pickupTimeSlot"),
    deliveryAddress: value("deliveryAddress"),
    deliveryDate: value("deliveryDate"),
    deliveryTimeSlot: value("deliveryTimeSlot"),
    specialInstructions: value("specialInstructions"),
  };
}

function toFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};

  for (const issue of issues) {
    const key = typeof issue.path[0] === "string" ? issue.path[0] : "form";

    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }

  return errors;
}

async function sendOrderConfirmationEmail(
  order: Order,
  items: OrderItem[],
): Promise<void> {
  try {
    const email = buildOrderConfirmationEmail({
      order,
      items,
      orderUrl: `${getAppUrl()}/checkout/confirmation/${order.orderNumber}`,
    });

    const result = await sendEmail({
      to: order.customerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.status === "sent") {
      await markConfirmationEmailSent(order.id);
      return;
    }

    console.warn(
      `[freshpress] order ${order.orderNumber} was saved but the confirmation email was not sent (${result.status})`,
    );
  } catch (error) {
    // Never rethrow: a mail failure must not affect a committed order.
    console.error(
      `[freshpress] order ${order.orderNumber} was saved but the confirmation email failed`,
      error,
    );
  }
}
export async function placeOrderAction(
  _previousState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const session = await getSession();

  if (!session?.user) {
    return {
      status: "error",
      message:
        "Your session has expired. Please sign in again to place your order — your cart is still saved.",
    };
  }

  const parsed = createCheckoutSchema().safeParse(readCheckoutForm(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields and try again.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  try {
    const result = await createOrder({
      ...parsed.data,
      userId: session.user.id,
    });

    if (result.status === "empty-cart") {
      return {
        status: "error",
        message:
          "There is nothing in your cart to order. Add a cleaning service and try again.",
      };
    }

    if (result.status === "duplicate") {
      // Exactly what a double click or a page refresh should do: go to the real order.
      redirect(`/checkout/confirmation/${result.orderNumber}`);
    }

    // Order is committed. Email is best-effort and must not undo anything.
    await sendOrderConfirmationEmail(result.order, result.items);

    revalidatePath("/account");
    revalidatePath("/account/orders");
    revalidatePath("/cart");

    redirect(`/checkout/confirmation/${result.orderNumber}`);
  } catch (error) {
    if (error instanceof OrderError) {
      return { status: "error", message: error.message };
    }

    console.error("[freshpress] failed to place an order", error);

    return {
      status: "error",
      message:
        "We could not place your order just now. Nothing has been charged and your cart is unchanged — please try again.",
    };
  }
}