"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { Menu } from "lucide-react";

export type MobileNavUser = {
  name: string;
  email: string;
} | null;

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pickup-delivery", label: "Pickup & delivery" },
  { href: "/cart", label: "Cart" },
];

/** Mobile navigation sheet (keyboard accessible via Radix Dialog). */
export function MobileNav({ user }: { user: MobileNavUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await authClient.signOut();
      setOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>
            {user ? `Signed in as ${user.email}` : "Browse FreshPress services"}
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="hover:bg-accent rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          {user ? (
            <>
              <Button asChild variant="outline">
                <Link href="/account" onClick={() => setOpen(false)}>
                  My account
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/account/orders" onClick={() => setOpen(false)}>
                  Order history
                </Link>
              </Button>
              <Button
                variant="ghost"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
              >
                <LogOut aria-hidden="true" />
                {signingOut ? "Signing out…" : "Sign out"}
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link href="/sign-in" onClick={() => setOpen(false)}>
                Sign in with Google
              </Link>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}