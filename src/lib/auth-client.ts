"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client.
 *
 * Contains no secrets — it simply talks to `/api/auth/*` on the same origin.
 */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;