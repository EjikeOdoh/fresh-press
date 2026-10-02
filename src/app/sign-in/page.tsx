import { ShieldCheck, Sparkles, Truck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SITE } from "@/lib/config";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in with Google to book and manage your ${SITE.name} cleaning orders.`,
  alternates: { canonical: "/sign-in" },
};

/** Only same-site, single-slash paths are accepted as a callback target. */
function safeCallbackUrl(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }

  return value;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const target = safeCallbackUrl(callbackUrl);
  const user = await getCurrentUser();

  if (user) {
    redirect(target);
  }

  return (
    <div className="container-page py-16 lg:py-24">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sign in to FreshPress</CardTitle>
            <CardDescription className="leading-relaxed">
              Sign in with Google to save your orders, keep your cart and receive
              confirmation emails. We never post anything to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <GoogleSignInButton
              callbackUrl={target}
              label="Continue with Google"
            />

            <ul className="text-muted-foreground grid gap-2 text-sm">
              <li className="flex items-center gap-2">
                <ShieldCheck className="text-success size-4" aria-hidden="true" />
                Google is our only sign-in method — no passwords to remember.
              </li>
              <li className="flex items-center gap-2">
                <Truck className="text-primary size-4" aria-hidden="true" />
                Your pickup and delivery details are pre-filled at checkout.
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="text-primary size-4" aria-hidden="true" />
                Track every order from your account.
              </li>
            </ul>

            <p className="text-muted-foreground text-center text-xs leading-relaxed">
              By continuing you agree to let {SITE.name} contact you about your
              orders. Your email address is only used for order updates.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}