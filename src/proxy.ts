import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route protection for signed-out visitors.
 *
 * SECURITY NOTE: this only checks that a session cookie *exists* — it does not validate
 * it, and a manually crafted cookie can bypass it. Every protected page, route handler and
 * server action therefore validates the session on the server with
 * `auth.api.getSession(...)` and enforces ownership in the database query.
 *
 * (Next.js 16 renamed the `middleware` convention to `proxy`.)
 */
const PROTECTED_PREFIXES = ["/account", "/checkout"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requiresAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.search = `?callbackUrl=${encodeURIComponent(pathname)}`;

    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/checkout/:path*"],
};