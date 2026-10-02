import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool as NodePgPool } from "pg";

import * as schema from "./schema";

/**
 * Driver-agnostic database type.
 *
 * Both `drizzle-orm/neon-serverless` (the driver used on Vercel against Neon) and
 * `drizzle-orm/node-postgres` (used for local Postgres, including the PGlite socket
 * server started by `npm run dev:db`) produce a `PgDatabase`, so application code can be
 * written once against this type and both drivers support real transactions — which the
 * checkout flow depends on.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

/** A transaction handle, used to keep `createOrder()` call signatures honest. */
export type DatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and add your Neon PostgreSQL connection string (see README.md).",
    );
  }
  return url;
}

/**
 * Decide which driver to use.
 *
 * - `DATABASE_DRIVER=neon` (default) → `@neondatabase/serverless` WebSocket Pool. Required
 *   for Neon on Vercel, where plain TCP sockets are not available.
 * - `DATABASE_DRIVER=pg` → `node-postgres`. Used for a local Postgres / PGlite socket
 *   server, which does not speak the Neon WebSocket protocol.
 * - A localhost connection string is auto-detected as `pg`, because Neon's WebSocket
 *   driver can never reach a plain TCP server.
 */
function resolveDriver(url: string): "neon" | "pg" {
  const configured = process.env.DATABASE_DRIVER?.trim().toLowerCase();

  if (configured === "pg" || configured === "node-postgres") {
    return "pg";
  }
  if (configured === "neon") {
    return "neon";
  }
  if (/@(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/.test(url)) {
    return "pg";
  }

  return "neon";
}

function createDatabase(): Database {
  const connectionString = requireDatabaseUrl();

  if (resolveDriver(connectionString) === "pg") {
    const pool = new NodePgPool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      // PGlite's socket server and typical local Postgres installs do not use TLS.
      ssl: connectionString.includes("sslmode=disable")
        ? false
        : undefined,
    });

    return drizzleNodePg(pool, { schema }) as unknown as Database;
  }

  const pool = new NeonPool({ connectionString });

  return drizzleNeon(pool, { schema }) as unknown as Database;
}

const globalForDatabase = globalThis as unknown as {
  __freshpressDatabase?: Database;
};

/**
 * Lazily create (and cache) the database client.
 *
 * Lazy creation keeps `next build` working without database credentials: nothing connects
 * until a page or action actually queries, and every page that touches the database is
 * dynamic.
 */
export function getDb(): Database {
  globalForDatabase.__freshpressDatabase ??= createDatabase();
  return globalForDatabase.__freshpressDatabase;
}