import { ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getCartSnapshot } from "@/db/cart";
import { SITE } from "@/lib/config";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Checkout",
  description: `Confirm your pickup and delivery details and place your ${SITE.name} cleaning order.`,
  alternates: { canonical: "/checkout" },
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  if (!user) {
    // Server-side enforcement (the proxy redirect is only an optimisation).
    redirect(`/sign-in?callbackUrl=${encodeURIComponent("/checkout")}`);
  }

  let cart = {
    lines: [] as Awaited<ReturnType<typeof getCartSnapshot>>["lines"],
    totals: { subtotal: 0, deliveryFee: 0, total: 0 },
    itemCount: 0,
  };
  let loadFailed = false;

  try {
    cart = await getCartSnapshot(user.id);
  } catch (error) {
    console.error("[freshpress] failed to load the cart for checkout", error);
    loadFailed = true;
  }

  return (
    <div className="container-page py-12 lg:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Checkout
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
          Confirm your details, choose your pickup and delivery windows, then review
          your order. We only ask for payment when your clothes are delivered.
        </p>
      </header>

      <div className="mt-10">
        {loadFailed ? (
          <Alert variant="destructive">
            <AlertTitle>We could not load your cart</AlertTitle>
            <AlertDescription>
              Please refresh the page and try again. If the problem continues,
              contact us at {SITE.email}.
            </AlertDescription>
          </Alert>
        ) : cart.lines.length === 0 ? (
          <div className="border-border flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-20 text-center">
            <ShoppingCart className="text-muted-foreground size-7" aria-hidden="true" />
            <div>
              <p className="text-lg font-medium">Your cart is empty</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Add a cleaning service before checking out.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/services">Browse services</Link>
            </Button>
          </div>
        ) : (
          <CheckoutForm
            user={{ name: user.name, email: user.email }}
            cart={{
              lines: cart.lines,
              totals: cart.totals,
              itemCount: cart.itemCount,
            }}
          />
        )}
      </div>
    </div>
  );
}