import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { getDb } from "@/db";
import * as schema from "@/db/schema";

/**
 * Better Auth server configuration.
 *
 * * Google is the **only** provider (no email/password auth).
 * * Secrets stay server-side: `src/lib/auth.ts` must never be imported by a client module
 *   (use `src/lib/auth-client.ts` in the browser).
 * * `nextCookies()` applies cookies that Better Auth sets inside Server Actions.
 */
export const auth = betterAuth({
  appName: "FreshPress Dry Cleaners",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // Always let the customer choose which Google account to use.
      prompt: "select_account",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh the session once per day
  },
  advanced: {
    // Non-production deployments (preview URLs) should still be able to sign in.
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;