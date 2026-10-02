import { Check, Circle, Clock, XCircle } from "lucide-react";

import { getOrderTimeline } from "@/lib/order-status";
import { cn } from "@/lib/utils";

const ICONS = {
  complete: Check,
  current: Clock,
  upcoming: Circle,
  skipped: XCircle,
} as const;

/** Vertical status timeline for an order detail page. */
export function OrderTimeline({ status }: { status: string }) {
  const steps = getOrderTimeline(status);

  return (
    <ol className="relative space-y-4">
      {steps.map((step) => {
        const Icon = ICONS[step.state];
        const isCurrent = step.state === "current";

        return (
          <li key={step.value} className="flex gap-3">
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border",
                step.state === "complete" && "border-success/40 bg-success/15 text-success",
                isCurrent && "border-primary bg-primary/15 text-primary",
                step.state === "upcoming" && "border-border text-muted-foreground",
                step.state === "skipped" &&
                  "border-destructive/30 bg-destructive/10 text-destructive",
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.state === "upcoming" && "text-muted-foreground",
                  step.state === "skipped" && "text-muted-foreground line-through",
                )}
              >
                {step.label}
                {isCurrent ? (
                  <span className="text-muted-foreground ml-2 text-xs font-normal">
                    Current
                  </span>
                ) : null}
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {step.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}