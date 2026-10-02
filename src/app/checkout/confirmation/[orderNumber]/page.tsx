import { CheckCircle2, MailWarning } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { OrderDetail } from "@/components/orders/order-detail";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getOrderForUser } from "@/db/orders";
import { SITE } from "@/lib/config";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Order confirmation",
  description: `Your ${SITE.name} order confirmation.`,
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent("/account/orders")}`);
  }

  const { orderNumber } = await params;
  const result = await getOrderForUser(user.id, orderNumber);

  // Ownership is enforced in the query: another customer's order number is a 404 here.
  if (!result) {
    notFound();
  }

  const { order, items } = result;

  return (
    <div className="container-page py-12 lg:py-16">
      <div className="mb-8 flex flex-col items-start gap-4">
        <span className="bg-success/15 text-success grid size-12 place-items-center rounded-full">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Thank you, {user.name.split(" ")[0] || "there"}!
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">
            Your order <strong>{order.orderNumber}</strong> has been received and
            saved. Our team will confirm your pickup shortly.
          </p>
        </div>
      </div>

      {order.confirmationEmailSentAt ? (
        <Alert variant="success" className="mb-8">
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Confirmation email sent</AlertTitle>
          <AlertDescription>
            We emailed the full order summary to {order.customerEmail}.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="info" className="mb-8">
          <MailWarning aria-hidden="true" />
          <AlertTitle>Confirmation email pending</AlertTitle>
          <AlertDescription>
            Your order is safely saved. We are still sending the confirmation email
            to {order.customerEmail} — you can always find the order in your account.
          </AlertDescription>
        </Alert>
      )}

      <OrderDetail order={order} items={items} />

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/account/orders">View all my orders</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/services">Book another cleaning</Link>
        </Button>
      </div>
    </div>
  );
}