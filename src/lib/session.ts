import { headers } from "next/headers";

import { auth } from "@/lib/auth";

/**
 * Server-side session helper.
 *
 * Always resolves the session from the request headers — never from a client-supplied
 * value. Returns `null` when the visitor is signed out.
 */
export async function getSession() {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    console.error("[freshpress] failed to resolve the session", error);
    return null;
  }
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name ?? session.user.email,
    email: session.user.email,
    image: session.user.image ?? null,
  };
}