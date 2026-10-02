"use client";

import { AlertCircle, Loader2, Lock, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  INITIAL_CHECKOUT_STATE,
  placeOrderAction,
  type CheckoutActionState,
} from "@/actions/checkout";
import type { CartSnapshotView } from "@/lib/cart-types";
import { CHECKOUT_LIMITS, TIME_SLOTS, type TimeSlotValue } from "@/lib/config";
import { addDaysToDateInputValue, toDateInputValue } from "@/lib/dates";
import { formatNaira } from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const selectClassName =
  "border-input bg-background h-10 w-full rounded-lg border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] aria-invalid:border-destructive";

type CheckoutFormProps = {
  user: { name: string; email: string };
  cart: CartSnapshotView;
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} role="alert" className="text-destructive text-xs">
      {message}
    </p>
  );
}

/** Checkout form: customer details, pickup/delivery schedule, review and place order. */
export function CheckoutForm({ user, cart }: CheckoutFormProps) {
  const [state, formAction, isPending] = useActionState<CheckoutActionState, FormData>(
    placeOrderAction,
    INITIAL_CHECKOUT_STATE,
  );

  const fieldErrors = state.status === "error" ? state.fieldErrors ?? {} : {};
  const today = useMemo(() => toDateInputValue(), []);
  const maxDate = useMemo(
    () => addDaysToDateInputValue(today, CHECKOUT_LIMITS.maxDaysAhead),
    [today],
  );

  const [sameAsPickup, setSameAsPickup] = useState(true);
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupDate, setPickupDate] = useState(today);
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [pickupSlot, setPickupSlot] = useState<TimeSlotValue>("MORNING");
  const [deliverySlot, setDeliverySlot] = useState<TimeSlotValue>("MORNING");
  const [instructions, setInstructions] = useState("");

  const effectiveDeliveryAddress = sameAsPickup ? pickupAddress : deliveryAddress;

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
      <div className="space-y-6">
        {state.status === "error" ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>We could not place your order</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
            <CardDescription>
              We use these to confirm your order. They are pre-filled from your Google
              account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="customerName">Full name</Label>
              <Input
                id="customerName"
                name="customerName"
                autoComplete="name"
                defaultValue={user.name}
                required
                aria-invalid={Boolean(fieldErrors.customerName)}
                aria-describedby="customerName-error"
              />
              <FieldError id="customerName-error" message={fieldErrors.customerName} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                name="customerEmail"
                type="email"
                autoComplete="email"
                defaultValue={user.email}
                required
                aria-invalid={Boolean(fieldErrors.customerEmail)}
                aria-describedby="customerEmail-error"
              />
              <FieldError id="customerEmail-error" message={fieldErrors.customerEmail} />
              <p className="text-muted-foreground text-xs">
                Your confirmation email is sent here.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customerPhone">Phone number</Label>
              <Input
                id="customerPhone"
                name="customerPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0801 234 5678"
                required
                aria-invalid={Boolean(fieldErrors.customerPhone)}
                aria-describedby="customerPhone-error"
              />
              <FieldError id="customerPhone-error" message={fieldErrors.customerPhone} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pickup</CardTitle>
            <CardDescription>
              When should we collect your clothes? Pickup is free.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="pickupAddress">Pickup address</Label>
              <Textarea
                id="pickupAddress"
                name="pickupAddress"
                rows={3}
                placeholder="14 Adeola Odeku Street, Victoria Island, Lagos"
                value={pickupAddress}
                onChange={(event) => setPickupAddress(event.target.value)}
                required
                aria-invalid={Boolean(fieldErrors.pickupAddress)}
                aria-describedby="pickupAddress-error"
              />
              <FieldError id="pickupAddress-error" message={fieldErrors.pickupAddress} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pickupDate">Pickup date</Label>
              <Input
                id="pickupDate"
                name="pickupDate"
                type="date"
                min={today}
                max={maxDate}
                value={pickupDate}
                onChange={(event) => setPickupDate(event.target.value)}
                required
                aria-invalid={Boolean(fieldErrors.pickupDate)}
                aria-describedby="pickupDate-error"
              />
              <FieldError id="pickupDate-error" message={fieldErrors.pickupDate} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pickupTimeSlot">Pickup time slot</Label>
              <select
                id="pickupTimeSlot"
                name="pickupTimeSlot"
                className={selectClassName}
                value={pickupSlot}
                onChange={(event) =>
                  setPickupSlot(event.target.value as TimeSlotValue)
                }
                required
                aria-invalid={Boolean(fieldErrors.pickupTimeSlot)}
                aria-describedby="pickupTimeSlot-error"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label} ({slot.window})
                  </option>
                ))}
              </select>
              <FieldError
                id="pickupTimeSlot-error"
                message={fieldErrors.pickupTimeSlot}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delivery</CardTitle>
            <CardDescription>
              Where and when should we return your fresh clothes?
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="text-muted-foreground flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                name="sameAsPickup"
                className="accent-primary size-4 rounded border"
                checked={sameAsPickup}
                onChange={(event) => setSameAsPickup(event.target.checked)}
              />
              Delivery address is same as pickup address
            </label>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="deliveryAddress">Delivery address</Label>
              <Textarea
                id="deliveryAddress"
                name="deliveryAddress"
                rows={3}
                placeholder="Same as pickup address"
                value={effectiveDeliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
                readOnly={sameAsPickup}
                required
                aria-invalid={Boolean(fieldErrors.deliveryAddress)}
                aria-describedby="deliveryAddress-error"
                className={sameAsPickup ? "bg-muted/50" : undefined}
              />
              <FieldError
                id="deliveryAddress-error"
                message={fieldErrors.deliveryAddress}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deliveryDate">Delivery date</Label>
              <Input
                id="deliveryDate"
                name="deliveryDate"
                type="date"
                min={pickupDate || today}
                max={maxDate}
                value={deliveryDate}
                onChange={(event) => setDeliveryDate(event.target.value)}
                required
                aria-invalid={Boolean(fieldErrors.deliveryDate)}
                aria-describedby="deliveryDate-error"
              />
              <FieldError id="deliveryDate-error" message={fieldErrors.deliveryDate} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deliveryTimeSlot">Delivery time slot</Label>
              <select
                id="deliveryTimeSlot"
                name="deliveryTimeSlot"
                className={selectClassName}
                value={deliverySlot}
                onChange={(event) =>
                  setDeliverySlot(event.target.value as TimeSlotValue)
                }
                required
                aria-invalid={Boolean(fieldErrors.deliveryTimeSlot)}
                aria-describedby="deliveryTimeSlot-error"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label} ({slot.window})
                  </option>
                ))}
              </select>
              <FieldError
                id="deliveryTimeSlot-error"
                message={fieldErrors.deliveryTimeSlot}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Special instructions</CardTitle>
            <CardDescription>
              Optional. Tell us about stains, delicate fabrics or anything we should
              know.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Label htmlFor="specialInstructions" className="sr-only">
              Special instructions
            </Label>
            <Textarea
              id="specialInstructions"
              name="specialInstructions"
              rows={4}
              maxLength={CHECKOUT_LIMITS.maxInstructionsLength}
              placeholder="e.g. Remove the coffee stain on the left cuff"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              aria-invalid={Boolean(fieldErrors.specialInstructions)}
              aria-describedby="specialInstructions-error"
            />
            <FieldError
              id="specialInstructions-error"
              message={fieldErrors.specialInstructions}
            />
          </CardContent>
        </Card>
      </div>
      <Card className="lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="size-4" aria-hidden="true" />
            Review order
          </CardTitle>
          <CardDescription>
            Check everything before you place your order. Prices are confirmed on our
            server from the live catalogue.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ul className="space-y-3 text-sm">
            {cart.lines.map((line) => (
              <li key={line.serviceId} className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-medium">{line.serviceName}</span>
                  <span className="text-muted-foreground text-xs">
                    {line.quantity} × {formatNaira(line.unitPrice)}
                  </span>
                </span>
                <span className="font-medium tabular-nums">
                  {formatNaira(line.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <Separator />

          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">
                Subtotal ({cart.itemCount}{" "}
                {cart.itemCount === 1 ? "garment" : "garments"})
              </dt>
              <dd className="tabular-nums">{formatNaira(cart.totals.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Delivery fee</dt>
              <dd className="tabular-nums">{formatNaira(cart.totals.deliveryFee)}</dd>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-base font-semibold">
              <dt>Total to pay on delivery</dt>
              <dd className="tabular-nums">{formatNaira(cart.totals.total)}</dd>
            </div>
          </dl>

          <Separator />

          <div className="grid gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Pickup
              </p>
              <p className="mt-1 font-medium">
                {pickupDate || "Choose a date"} ·{" "}
                {TIME_SLOTS.find((slot) => slot.value === pickupSlot)?.label ?? ""}
              </p>
              <p className="text-muted-foreground text-xs">
                {pickupAddress || "Enter your pickup address"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Delivery
              </p>
              <p className="mt-1 font-medium">
                {deliveryDate || "Choose a date"} ·{" "}
                {TIME_SLOTS.find((slot) => slot.value === deliverySlot)?.label ?? ""}
              </p>
              <p className="text-muted-foreground text-xs">
                {effectiveDeliveryAddress || "Enter your delivery address"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Special instructions
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {instructions.trim() || "None"}
              </p>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Placing your order…
              </>
            ) : (
              <>
                <Lock aria-hidden="true" />
                Place order
              </>
            )}
          </Button>

          <p className="text-muted-foreground text-xs leading-relaxed">
            No payment is taken online. You pay our courier when your clothes are
            delivered. A confirmation email is sent as soon as your order is saved.
          </p>
          <p className="text-muted-foreground text-xs">
            Need to change something?{" "}
            <Link href="/cart" className="text-primary underline-offset-4 hover:underline">
              Back to cart
            </Link>
          </p>
        </CardContent>
      </Card>
    </form>
  );
}