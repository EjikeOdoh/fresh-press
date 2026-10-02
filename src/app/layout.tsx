import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

import { CartNotifications } from "@/components/cart/cart-notifications";
import { CartProvider } from "@/components/cart/cart-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCartSnapshot } from "@/db/cart";
import { SITE, getAppUrl } from "@/lib/config";
import { getCurrentUser, type SessionUser } from "@/lib/session";
import type { CartSnapshotView } from "@/lib/cart-types";

const appUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "dry cleaning",
    "laundry service",
    "wash and fold",
    "ironing",
    "deep cleaning",
    "pickup and delivery",
    "Lagos dry cleaner",
  ],
  authors: [{ name: SITE.name }],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: appUrl,
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

/** Load the signed-in customer's persistent cart for the providers/header. */
async function loadInitialCart(user: SessionUser | null): Promise<CartSnapshotView | null> {
  if (!user) {
    return null;
  }

  try {
    const cart = await getCartSnapshot(user.id);

    return {
      lines: cart.lines,
      totals: cart.totals,
      itemCount: cart.itemCount,
    };
  } catch (error) {
    console.error("[freshpress] failed to load the customer cart", error);
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  const initialCart = await loadInitialCart(user);

  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="focus:bg-background focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:rounded-md focus:px-4 focus:py-2 focus:shadow-lg"
        >
          Skip to main content
        </a>
        <CartProvider
          isAuthenticated={Boolean(user)}
          initialCart={initialCart}
        >
          <SiteHeader user={user} />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <CartNotifications />
        </CartProvider>
      </body>
    </html>
  );
}