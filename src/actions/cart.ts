"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  addCartItem,
  CartError,
  clearCart,
  getCartSnapshot,
  mergeGuestCart,
  removeCartItem,
  setCartItemQuantity,
  type CartSnapshot,
} from "@/db/cart";
import type {
  CartActionFailure,
  CartActionResult,
  CartSnapshotView,
} from "@/lib/cart-types";
import { auth } from "@/lib/auth";
import { cartItemInputSchema } from "@/lib/validation";

/**
 * Cart server actions for signed-in customers.
 *
 * The browser only ever sends a service id and a quantity — never a price. Quantities are
 * validated here and clamped again in the data layer.
 */

async function getCurrentUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

function toView(cart: CartSnapshot): CartSnapshotView {
  return {
    lines: cart.lines,
    totals: cart.totals,
    itemCount: cart.itemCount,
  };
}

function toSuccess(cart: CartSnapshot): CartActionResult {
  revalidatePath("/cart");
  revalidatePath("/checkout");

  return { ok: true, cart: toView(cart) };
}

function toFailure(
  error: unknown,
  code: CartActionFailure["code"] = "UNKNOWN",
  message = "We could not update your cart. Please try again.",
): CartActionResult {
  if (error instanceof CartError) {
    return { ok: false, error: error.message, code: "INVALID_INPUT" };
  }

  console.error("[freshpress] cart action failed", error);
  return { ok: false, error: message, code };
}

const UNAUTHENTICATED: CartActionFailure = {
  ok: false,
  code: "UNAUTHENTICATED",
  error: "Sign in to save your cart to your account.",
};

export async function getCartAction(): Promise<CartActionResult> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return UNAUTHENTICATED;
  }

  try {
    return toSuccess(await getCartSnapshot(userId));
  } catch (error) {
    return toFailure(error);
  }
}

export async function addToCartAction(input: {
  serviceId: string;
  quantity?: number;
}): Promise<CartActionResult> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return UNAUTHENTICATED;
  }

  const parsed = cartItemInputSchema.safeParse({
    serviceId: input.serviceId,
    quantity: input.quantity ?? 1,
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      error: parsed.error.issues[0]?.message ?? "Invalid item",
    };
  }

  try {
    return toSuccess(
      await addCartItem(userId, parsed.data.serviceId, parsed.data.quantity),
    );
  } catch (error) {
    return toFailure(error);
  }
}

export async function setCartItemQuantityAction(input: {
  serviceId: string;
  quantity: number;
}): Promise<CartActionResult> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return UNAUTHENTICATED;
  }

  const parsed = cartItemInputSchema
    .extend({ quantity: cartItemInputSchema.shape.quantity.min(0).max(99) })
    .safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      error: parsed.error.issues[0]?.message ?? "Invalid quantity",
    };
  }

  try {
    return toSuccess(
      await setCartItemQuantity(
        userId,
        parsed.data.serviceId,
        parsed.data.quantity,
      ),
    );
  } catch (error) {
    return toFailure(error);
  }
}

export async function removeCartItemAction(input: {
  serviceId: string;
}): Promise<CartActionResult> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return UNAUTHENTICATED;
  }

  const parsed = cartItemInputSchema
    .pick({ serviceId: true })
    .safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      error: "Invalid item",
    };
  }

  try {
    return toSuccess(await removeCartItem(userId, parsed.data.serviceId));
  } catch (error) {
    return toFailure(error);
  }
}

export async function clearCartAction(): Promise<CartActionResult> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return UNAUTHENTICATED;
  }

  try {
    await clearCart(userId);
    return toSuccess(await getCartSnapshot(userId));
  } catch (error) {
    return toFailure(error);
  }
}

/**
 * Merge the browser-local (guest) cart into the signed-in customer's cart.
 * Called once, right after a successful sign-in.
 */
export async function mergeGuestCartAction(input: {
  items: { serviceId: string; quantity: number }[];
}): Promise<CartActionResult> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return UNAUTHENTICATED;
  }

  const parsed = cartItemInputSchema.array().max(30).safeParse(input.items);

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      error: "We could not merge your guest cart.",
    };
  }

  try {
    return toSuccess(await mergeGuestCart(userId, parsed.data));
  } catch (error) {
    return toFailure(error);
  }
}