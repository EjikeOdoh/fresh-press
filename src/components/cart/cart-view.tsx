"use client";

import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";

import { useCart } from "@/components/cart/cart-provider";
import { ServiceImage } from "@/components/service-image";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNaira } from "@/lib/money";

/** Interactive cart contents (guest carts are browser-local, user carts are in the DB). */
export function CartView() {
  const {
    lines,
    totals,
    itemCount,
    ready,
    pending,
    error,
    isAuthenticated,
    increment,
    decrement,
    removeItem,
    clearCart,
  } = useCart();

  if (!ready) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="border-border flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-20 text-center">
        <ShoppingBag className="text-muted-foreground size-7" aria-hidden="true" />
        <div>
          <p className="text-lg font-medium">Your cart is empty</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Add the clothes you need cleaned and they will appear here.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/services">Browse services</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <ul className="space-y-4">
          {lines.map((line) => (
            <li key={line.serviceId}>
              <Card className="overflow-hidden py-0">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="border-border relative size-20 shrink-0 overflow-hidden rounded-xl border">
                    <ServiceImage
                      src={line.imageUrl}
                      alt={`${line.serviceName} selected for cleaning`}
                      sizes="80px"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/services/${line.serviceSlug}`}
                      className="hover:text-primary font-medium transition-colors"
                    >
                      {line.serviceName}
                    </Link>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {formatNaira(line.unitPrice)} per item
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9"
                      aria-label={`Decrease quantity of ${line.serviceName}`}
                      disabled={pending}
                      onClick={() => void decrement(line.serviceId)}
                    >
                      <Minus aria-hidden="true" />
                    </Button>
                    <span
                      className="w-10 text-center text-sm font-semibold tabular-nums"
                      aria-live="polite"
                    >
                      <span className="sr-only">
                        {line.serviceName} quantity:{" "}
                      </span>
                      {line.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9"
                      aria-label={`Increase quantity of ${line.serviceName}`}
                      disabled={pending || line.quantity >= 99}
                      onClick={() => void increment(line.serviceId)}
                    >
                      <Plus aria-hidden="true" />
                    </Button>
                  </div>

                  <div className="text-right sm:w-24">
                    <p className="font-semibold tabular-nums">
                      {formatNaira(line.lineTotal)}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive size-9"
                    aria-label={`Remove ${line.serviceName} from cart`}
                    disabled={pending}
                    onClick={() => void removeItem(line.serviceId)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/services">Continue shopping</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            disabled={pending}
            onClick={() => void clearCart()}
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
            Empty cart
          </Button>
        </div>
      </div>
      <Card className="lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="text-lg">Order summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">
                Items ({itemCount} {itemCount === 1 ? "garment" : "garments"})
              </dt>
              <dd className="font-medium tabular-nums">
                {formatNaira(totals.subtotal)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Delivery fee</dt>
              <dd className="font-medium tabular-nums">
                {formatNaira(totals.deliveryFee)}
              </dd>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-semibold tabular-nums">
                {formatNaira(totals.total)}
              </dd>
            </div>
          </dl>

          <Button asChild size="lg" className="w-full">
            <Link href="/checkout">Proceed to checkout</Link>
          </Button>

          {!isAuthenticated ? (
            <p className="text-muted-foreground text-xs leading-relaxed">
              You will sign in with Google at checkout so we can save your order and
              send a confirmation email. Your cart items are kept.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs leading-relaxed">
              Your cart is saved to your account and will be here whenever you
              return.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}