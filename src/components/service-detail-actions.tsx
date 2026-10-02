"use client";

import { useState } from "react";

import {
  AddToCartButton,
  QuantitySelector,
} from "@/components/add-to-cart-button";
import type { AddableService } from "@/components/cart/cart-provider";
import { Label } from "@/components/ui/label";

/** Quantity picker + add-to-cart for the service detail page. */
export function ServiceDetailActions({ service }: { service: AddableService }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="service-quantity">How many items?</Label>
        <div id="service-quantity">
          <QuantitySelector value={quantity} onChange={setQuantity} />
        </div>
      </div>
      <AddToCartButton service={service} quantity={quantity} size="lg" />
    </div>
  );
}