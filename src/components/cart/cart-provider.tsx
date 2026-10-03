"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  addToCartAction,
  clearCartAction,
  getCartAction,
  mergeGuestCartAction,
  removeCartItemAction,
  setCartItemQuantityAction,
} from "@/actions/cart";
import type {
  CartLine,
  CartSnapshotView,
  CartTotalsView,
  GuestCartEntry,
  ServicePriceView,
} from "@/lib/cart-types";
import { CART_LIMITS, DELIVERY_FEE_NAIRA } from "@/lib/config";
import { calculateOrderTotals } from "@/lib/money";
import { guestCartSchema } from "@/lib/validation";

/** Guests keep only ids and quantities in the browser — never prices. */
const GUEST_CART_STORAGE_KEY = "freshpress.cart.v1";

export type AddableService = ServicePriceView;

type CartContextValue = {
  isAuthenticated: boolean;
  lines: CartLine[];
  totals: CartTotalsView;
  itemCount: number;
  /** `true` once the initial cart has been resolved (guest fetch or server snapshot). */
  ready: boolean;
  /** `true` while a server action is in flight. */
  pending: boolean;
  error: string | null;
  notice: string | null;
  addItem: (service: AddableService, quantity?: number) => Promise<boolean>;
  setQuantity: (serviceId: string, quantity: number) => Promise<boolean>;
  increment: (serviceId: string) => Promise<boolean>;
  decrement: (serviceId: string) => Promise<boolean>;
  removeItem: (serviceId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  refresh: () => Promise<void>;
  dismissNotice: () => void;
  clearError: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readGuestCart(): GuestCartEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = guestCartSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function writeGuestCart(entries: GuestCartEntry[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (entries.length === 0) {
      window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage can be unavailable (private mode); the cart then simply does not persist.
  }
}

function clampQuantity(quantity: number): number {
  return Math.min(
    Math.max(Math.trunc(Number.isFinite(quantity) ? quantity : 1), CART_LIMITS.minQuantity),
    CART_LIMITS.maxQuantity,
  );
}

function toTotals(lines: CartLine[]): CartTotalsView {
  return calculateOrderTotals(lines, DELIVERY_FEE_NAIRA);
}

function countItems(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

async function fetchServicePrices(
  ids: readonly string[],
): Promise<Map<string, ServicePriceView>> {
  if (ids.length === 0) {
    return new Map();
  }

  const response = await fetch(`/api/services?ids=${ids.join(",")}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load service prices");
  }

  const payload = (await response.json()) as { services: ServicePriceView[] };
  return new Map(payload.services.map((service) => [service.id, service]));
}

function buildGuestLines(
  entries: readonly GuestCartEntry[],
  catalogue: Map<string, ServicePriceView>,
): CartLine[] {
  return entries.flatMap((entry) => {
    const service = catalogue.get(entry.serviceId);
    const quantity = clampQuantity(entry.quantity);

    if (!service) {
      return [];
    }

    return [
      {
        cartItemId: "",
        serviceId: service.id,
        quantity,
        serviceName: service.name,
        serviceSlug: service.slug,
        imageUrl: service.imageUrl,
        unitPrice: service.price,
        lineTotal: service.price * quantity,
      },
    ];
  });
}
export function CartProvider({
  children,
  isAuthenticated,
  initialCart,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
  initialCart: CartSnapshotView | null;
}) {
  const catalogueRef = useRef<Map<string, ServicePriceView>>(new Map());
  const mergeAttemptedRef = useRef(false);
  const [lines, setLines] = useState<CartLine[]>(initialCart?.lines ?? []);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const applyGuestEntries = useCallback(
    async (
      entries: GuestCartEntry[],
      extraServices: readonly ServicePriceView[] = [],
    ) => {
      const catalogue = new Map(catalogueRef.current);

      for (const service of extraServices) {
        catalogue.set(service.id, service);
      }

      const missing = entries
        .map((entry) => entry.serviceId)
        .filter((serviceId) => !catalogue.has(serviceId));

      if (missing.length > 0) {
        const fetched = await fetchServicePrices(missing);

        for (const [id, service] of fetched) {
          catalogue.set(id, service);
        }
      }

      catalogueRef.current = catalogue;
      setLines(buildGuestLines(entries, catalogue));
    },
    [],
  );

  /* Initial load: resolve the guest cart (if any) or the server snapshot. */
  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      if (isAuthenticated) {
        setLines(initialCart?.lines ?? []);
        setReady(true);

        // Merge a guest cart once, right after signing in.
        if (!mergeAttemptedRef.current) {
          mergeAttemptedRef.current = true;
          const guestEntries = readGuestCart();

          if (guestEntries.length > 0) {
            const result = await mergeGuestCartAction({ items: guestEntries });

            if (!cancelled) {
              if (result.ok) {
                setLines(result.cart.lines);
                writeGuestCart([]);
                setNotice(
                  "Items from your previous cart were added to your account.",
                );
              } else if (result.code !== "UNAUTHENTICATED") {
                setError(result.error);
              }
            }
          }
        }

        return;
      }

      const entries = readGuestCart();

      if (entries.length === 0) {
        setLines([]);
        setReady(true);
        return;
      }

      try {
        await applyGuestEntries(entries);
      } catch {
        if (!cancelled) {
          setError("We could not load your saved cart. Please refresh the page.");
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void initialise();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, initialCart, applyGuestEntries]);

  const persistGuestQuantity = useCallback(
    async (serviceId: string, quantity: number, service?: ServicePriceView) => {
      const current = readGuestCart();
      const safeQuantity = clampQuantity(quantity);

      const next =
        safeQuantity <= 0
          ? current.filter((entry) => entry.serviceId !== serviceId)
          : current.some((entry) => entry.serviceId === serviceId)
            ? current.map((entry) =>
                entry.serviceId === serviceId
                  ? { ...entry, quantity: safeQuantity }
                  : entry,
              )
            : [...current, { serviceId, quantity: safeQuantity }];

      const trimmed = next.slice(0, CART_LIMITS.maxDistinctItems);
      writeGuestCart(trimmed);
      await applyGuestEntries(trimmed, service ? [service] : []);
    },
    [applyGuestEntries],
  );

  const addItem = useCallback(
    async (service: AddableService, quantity = 1) => {
      const safeQuantity = clampQuantity(quantity);
      setError(null);
      setPending(true);

      try {
        if (isAuthenticated) {
          const result = await addToCartAction({
            serviceId: service.id,
            quantity: safeQuantity,
          });

          if (!result.ok) {
            setError(result.error);
            return false;
          }

          setLines(result.cart.lines);
        } else {
          const entries = readGuestCart();
          const existing = entries.find((entry) => entry.serviceId === service.id);

          await persistGuestQuantity(
            service.id,
            existing ? existing.quantity + safeQuantity : safeQuantity,
            service,
          );
        }

        setNotice(`${service.name} added to your cart.`);
        return true;
      } catch {
        setError("We could not add that item. Please try again.");
        return false;
      } finally {
        setPending(false);
      }
    },
    [isAuthenticated, persistGuestQuantity],
  );
  const setQuantity = useCallback(
    async (serviceId: string, quantity: number) => {
      const safeQuantity = clampQuantity(quantity);
      setError(null);
      setPending(true);

      try {
        if (isAuthenticated) {
          const result = await setCartItemQuantityAction({
            serviceId,
            quantity: quantity <= 0 ? 0 : safeQuantity,
          });

          if (!result.ok) {
            setError(result.error);
            return false;
          }

          setLines(result.cart.lines);
        } else {
          await persistGuestQuantity(serviceId, quantity <= 0 ? 0 : safeQuantity);
        }

        return true;
      } catch {
        setError("We could not update your cart. Please try again.");
        return false;
      } finally {
        setPending(false);
      }
    },
    [isAuthenticated, persistGuestQuantity],
  );

  const increment = useCallback(
    (serviceId: string) => {
      const line = lines.find((candidate) => candidate.serviceId === serviceId);
      return setQuantity(serviceId, (line?.quantity ?? 0) + 1);
    },
    [lines, setQuantity],
  );

  const decrement = useCallback(
    (serviceId: string) => {
      const line = lines.find((candidate) => candidate.serviceId === serviceId);
      return setQuantity(serviceId, (line?.quantity ?? 1) - 1);
    },
    [lines, setQuantity],
  );

  const removeItem = useCallback(
    async (serviceId: string) => {
      setError(null);
      setPending(true);

      try {
        if (isAuthenticated) {
          const result = await removeCartItemAction({ serviceId });

          if (!result.ok) {
            setError(result.error);
            return false;
          }

          setLines(result.cart.lines);
        } else {
          await persistGuestQuantity(serviceId, 0);
        }

        setNotice("Item removed from your cart.");
        return true;
      } catch {
        setError("We could not remove that item. Please try again.");
        return false;
      } finally {
        setPending(false);
      }
    },
    [isAuthenticated, persistGuestQuantity],
  );

  const clearCart = useCallback(async () => {
    setError(null);
    setPending(true);

    try {
      if (isAuthenticated) {
        const result = await clearCartAction();

        if (!result.ok) {
          setError(result.error);
          return false;
        }

        setLines(result.cart.lines);
      } else {
        writeGuestCart([]);
        setLines([]);
      }

      return true;
    } catch {
      setError("We could not empty your cart. Please try again.");
      return false;
    } finally {
      setPending(false);
    }
  }, [isAuthenticated]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      await applyGuestEntries(readGuestCart());
      return;
    }

    const result = await getCartAction();

    if (result.ok) {
      setLines(result.cart.lines);
    }
  }, [applyGuestEntries, isAuthenticated]);

  const value = useMemo<CartContextValue>(
    () => ({
      isAuthenticated,
      lines,
      totals: toTotals(lines),
      itemCount: countItems(lines),
      ready,
      pending,
      error,
      notice,
      addItem,
      setQuantity,
      increment,
      decrement,
      removeItem,
      clearCart,
      refresh,
      dismissNotice: () => setNotice(null),
      clearError: () => setError(null),
    }),
    [
      addItem,
      clearCart,
      decrement,
      error,
      increment,
      isAuthenticated,
      lines,
      notice,
      pending,
      ready,
      refresh,
      removeItem,
      setQuantity,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside a <CartProvider>");
  }

  return context;
}