"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Cart link with a live item-count badge (works for guests and signed-in customers). */
export function CartBadge({ className }: { className?: string }) {
  const { itemCount, ready } = useCart();
  const label =
    itemCount > 0
      ? `Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
      : "Cart, empty";

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className={cn("relative", className)}
    >
      <Link href="/cart" aria-label={label}>
        <ShoppingBag aria-hidden="true" />
        {ready && itemCount > 0 ? (
          <span
            aria-hidden="true"
            className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full px-1 text-[11px] font-semibold"
          >
            {itemCount}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}