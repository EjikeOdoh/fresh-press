import { Mail, MapPin, MessageSquare, Phone } from "lucide-react";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderTimeline } from "@/components/orders/order-timeline";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Order, OrderItem } from "@/db/schema/app";
import { getTimeSlotLabel } from "@/lib/config";
import { formatOrderDate, formatDateTime } from "@/lib/dates";
import { formatNaira } from "@/lib/money";

/** Full order detail — used by the confirmation page and the account order page. */
export function OrderDetail({
  order,
  items,
}: {
  order: Order;
  items: OrderItem[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">
                  Order {order.orderNumber}
                </CardTitle>
                <CardDescription>
                  Placed {formatDateTime(order.createdAt)}
                </CardDescription>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Items in this order with quantities and prices
                </caption>
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Item
                    </th>
                    <th scope="col" className="py-2 pr-3 text-center font-medium">
                      Qty
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">
                      Unit price
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Line total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <th scope="row" className="py-3 pr-3 text-left font-medium">
                        {item.serviceName}
                      </th>
                      <td className="py-3 pr-3 text-center tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums">
                        {formatNaira(item.unitPrice)}
                      </td>
                      <td className="py-3 text-right font-medium tabular-nums">
                        {formatNaira(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Separator />

            <dl className="ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatNaira(order.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Delivery fee</dt>
                <dd className="tabular-nums">{formatNaira(order.deliveryFee)}</dd>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatNaira(order.total)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pickup &amp; delivery</CardTitle>
            <CardDescription>
              What we collected, and where and when we will return it.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Pickup
              </p>
              <p className="flex items-start gap-2 text-sm">
                <MapPin className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{order.pickupAddress}</span>
              </p>
              <p className="text-sm font-medium">
                {formatOrderDate(order.pickupDate)}
              </p>
              <p className="text-muted-foreground text-xs">
                {getTimeSlotLabel(order.pickupTimeSlot)}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Delivery
              </p>
              <p className="flex items-start gap-2 text-sm">
                <MapPin className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{order.deliveryAddress}</span>
              </p>
              <p className="text-sm font-medium">
                {formatOrderDate(order.deliveryDate)}
              </p>
              <p className="text-muted-foreground text-xs">
                {getTimeSlotLabel(order.deliveryTimeSlot)}
              </p>
            </div>

            <Separator className="sm:col-span-2" />

            <div className="space-y-2 sm:col-span-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Special instructions
              </p>
              <p className="flex items-start gap-2 text-sm">
                <MessageSquare
                  className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">
                  {order.specialInstructions?.trim() || "None"}
                </span>
              </p>
            </div>

            <Separator className="sm:col-span-2" />

            <div className="grid gap-2 sm:col-span-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Contact for this order
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Phone className="text-muted-foreground size-4" aria-hidden="true" />
                {order.customerPhone}
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Mail className="text-muted-foreground size-4" aria-hidden="true" />
                {order.customerEmail}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="text-lg">Order progress</CardTitle>
          <CardDescription>
            {order.confirmationEmailSentAt
              ? `Confirmation email sent ${formatDateTime(order.confirmationEmailSentAt)}`
              : "A confirmation email will be sent as soon as it is delivered by our mail provider."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrderTimeline status={order.status} />
        </CardContent>
      </Card>
    </div>
  );
}