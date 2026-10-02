"use client";

import { Check, Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { useCart, type AddableService } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AddToCartButtonProps = {
  service: AddableService;
  quantity?: number;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
  label?: string;
};

/** Adds a service to the guest or authenticated cart, with an inline success state. */
export function AddToCartButton({
  service,
  quantity = 1,
  size = "default",
  variant = "default",
  className,
  label = "Add to cart",
}: AddToCartButtonProps) {
  const { addItem, pending } = useCart();
  const [added, setAdded] = useState(false);

  async function handleClick() {
    const success = await addItem(service, quantity);

    if (success) {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 2000);
    }
  }

  return (
    <Button
      size={size}
      variant={variant}
      className={cn(className)}
      disabled={pending}
      onClick={() => void handleClick()}
      aria-live="polite"
    >
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : added ? (
        <Check aria-hidden="true" />
      ) : (
        <Plus aria-hidden="true" />
      )}
      {added ? "Added" : label}
    </Button>
  );
}

/** Accessible quantity stepper used on the service detail page. */
export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="group"
      aria-label="Quantity"
    >
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <span aria-hidden="true">−</span>
      </Button>
      <span
        aria-live="polite"
        className="border-input grid h-10 w-14 place-items-center rounded-lg border text-sm font-semibold tabular-nums"
      >
        <span className="sr-only">Quantity: </span>
        {value}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <span aria-hidden="true">+</span>
      </Button>
    </div>
  );
}