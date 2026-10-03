import { neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import WebSocketConstructor from "ws";

import * as schema from "./schema";

// The Neon serverless driver talks to Neon over WebSocket. In a Node.js runtime
// (i.e. `next dev`, route handlers, server actions) there is no browser
// WebSocket that the driver can use, so we must hand it the `ws` implementation.
// Without this, every query fails with an opaque `ErrorEvent { type: 'error', ... }`
// — exactly the failure seen on the home page's `listFeaturedServices` query.
// (Browser bundles never execute this: `src/db/*` is only imported server-side.)
if (typeof window === "undefined") {
  neonConfig.webSocketConstructor =
    WebSocketConstructor as unknown as typeof WebSocket;
}

/**
 * The application's database type (`drizzle-orm/neon-serverless` against Neon).
 *
 * Every query and every transaction (e.g. `createOrder()`'s checkout transaction)
 * goes through this type; the driver supports real transactions, which the
 * checkout flow depends on.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

/** A transaction handle, used to keep `createOrder()` call signatures honest. */
export type DatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and add your Neon PostgreSQL connection string (see README.md).",
    );
  }
  return url;
}

function createDatabase(): Database {
  const connectionString = requireDatabaseUrl();
  const pool = new NeonPool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  });

  return drizzle(pool, { schema });
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