import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

/**
 * Better Auth catch-all route handler.
 *
 * Google OAuth callback: `/api/auth/callback/google`
 */
export const { GET, POST } = toNextJsHandler(auth);