import type { Metadata } from "next";

import { CartView } from "@/components/cart/cart-view";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Your cart",
  description: `Review the clothes you selected for cleaning at ${SITE.name}, adjust quantities and continue to checkout.`,
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="container-page py-12 lg:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Your cart
      </h1>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">
        Check the items and quantities you need cleaned. Prices always come from
        our live catalogue — you will confirm the final total at checkout.
      </p>

      <div className="mt-10">
        <CartView />
      </div>
    </div>
  );
}