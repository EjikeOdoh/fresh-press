import { Badge } from "@/components/ui/badge";
import { getOrderStatus, getOrderStatusBadgeClass } from "@/lib/order-status";
import { cn } from "@/lib/utils";

/** Colour-coded order status pill (labels/colours come from `src/lib/order-status.ts`). */
export function OrderStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = getOrderStatus(status);

  return (
    <Badge
      variant="outline"
      className={cn("border font-medium", getOrderStatusBadgeClass(status), className)}
      title={meta.description}
    >
      <span className="sr-only">Order status: </span>
      {meta.label}
    </Badge>
  );
}