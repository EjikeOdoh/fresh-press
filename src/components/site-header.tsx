import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { CartBadge } from "@/components/cart/cart-badge";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/config";
import type { SessionUser } from "@/lib/session";

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pickup-delivery", label: "Pickup & delivery" },
  { href: "/#why-freshpress", label: "Why FreshPress" },
];

/** Responsive site header. Server-rendered; interactive parts are client components. */
export function SiteHeader({ user }: { user: SessionUser | null }) {
  return (
    <header className="bg-background/85 sticky top-0 z-50 border-b backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span
            aria-hidden="true"
            className="from-primary to-primary/60 grid size-9 place-items-center rounded-lg bg-gradient-to-br text-sm font-bold text-primary-foreground"
          >
            FP
          </span>
          <span className="text-base sm:text-lg">{SITE.shortName}</span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <CartBadge />
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
          <MobileNav user={user ? { name: user.name, email: user.email } : null} />
        </div>
      </div>
    </header>
  );
}