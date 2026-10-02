import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import type * as React from "react";

import { SITE } from "@/lib/config";

const serviceLinks = [
  { href: "/services", label: "All services" },
  { href: "/services?category=dry-cleaning", label: "Dry cleaning" },
  { href: "/services?category=wash-and-fold", label: "Wash & fold" },
  { href: "/services?category=ironing", label: "Ironing" },
  { href: "/services?category=deep-cleaning", label: "Deep cleaning" },
];

const accountLinks = [
  { href: "/cart", label: "Cart" },
  { href: "/checkout", label: "Checkout" },
  { href: "/account", label: "My account" },
  { href: "/account/orders", label: "Order history" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/40">
      <div className="container-page py-12 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold tracking-tight"
            >
              <span className="from-primary to-primary/60 grid size-9 place-items-center rounded-lg bg-gradient-to-br text-sm font-bold text-primary-foreground">
                FP
              </span>
              <span className="text-lg">{SITE.shortName}</span>
            </Link>
            <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
              {SITE.description}
            </p>
          </div>

          <nav aria-label="Services" className="space-y-3">
            <h2 className="text-sm font-semibold">Services</h2>
            <ul className="space-y-2 text-sm">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Account" className="space-y-3">
            <h2 className="text-sm font-semibold">Your account</h2>
            <ul className="space-y-2 text-sm">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Contact</h2>
            <ul className="text-muted-foreground space-y-3 text-sm">
              <li className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{SITE.address}</span>
              </li>
              <li className="flex gap-2">
                <Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <a
                  href={SITE.phoneHref}
                  className="transition-colors hover:text-foreground"
                >
                  {SITE.phone}
                </a>
              </li>
              <li className="flex gap-2">
                <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <a
                  href={`mailto:${SITE.email}`}
                  className="transition-colors hover:text-foreground"
                >
                  {SITE.email}
                </a>
              </li>
              <li className="flex gap-2">
                <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{SITE.hours}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {SITE.name}. All rights reserved.
          </p>
          <p>
            Contact details and testimonials on this site are demonstration content.
          </p>
        </div>
      </div>
    </footer>
  );
}