"use client";

import { CircleCheck, CircleX, X } from "lucide-react";
import { useEffect } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";

/**
 * Lightweight, accessible feedback region for cart actions.
 *
 * Renders nothing when there is no message; announces changes with `aria-live` so screen
 * readers pick them up. Auto-dismisses after a few seconds.
 */
export function CartNotifications() {
  const { notice, error, dismissNotice, clearError } = useCart();

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(dismissNotice, 4000);
    return () => window.clearTimeout(timeout);
  }, [dismissNotice, notice]);

  if (!notice && !error) {
    return null;
  }

  const isError = Boolean(error);
  const message = error ?? notice ?? "";

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4"
    >
      <div
        role={isError ? "alert" : "status"}
        className={cn(
          "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg",
          isError
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-success/40 bg-background text-foreground",
        )}
      >
        {isError ? (
          <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        ) : (
          <CircleCheck className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
        )}
        <p className="flex-1 leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={() => (isError ? clearError() : dismissNotice())}
          className="rounded-md p-0.5 opacity-70 transition-opacity hover:opacity-100"
          aria-label={isError ? "Dismiss error" : "Dismiss message"}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}