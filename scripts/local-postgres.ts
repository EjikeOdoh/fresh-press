/**
 * Local development database.
 *
 * Starts an in-process PGlite (PostgreSQL compiled to WebAssembly) instance and exposes it
 * over the PostgreSQL wire protocol on `127.0.0.1:5433`, so the real application, the real
 * Drizzle driver and the real migrations can run locally without a Neon project or Docker.
 *
 * Usage:
 *
 *   # terminal 1
 *   npm run dev:db
 *
 *   # terminal 2 (.env must contain the two values printed by the script)
 *   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable"
 *   DATABASE_DRIVER=pg
 *   npm run db:migrate && npm run db:seed && npm run dev
 *
 * Data is persisted in `./.dev-data/pglite` (git-ignored). Set `PGLITE_DATA_DIR=memory://`
 * for a throw-away database.
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const dataDir = process.env.PGLITE_DATA_DIR ?? "./.dev-data/pglite";
const port = Number(process.env.PGLITE_PORT ?? 5433);
const host = process.env.PGLITE_HOST ?? "127.0.0.1";

const db = await PGlite.create(dataDir);

const server = new PGLiteSocketServer({
  db,
  port,
  host,
  // Next.js opens several connections concurrently; PGlite multiplexes them.
  maxConnections: 20,
});

await server.start();

console.log(`[freshpress] PGlite is listening on ${host}:${port}`);
console.log(`[freshpress] data directory: ${dataDir}`);
console.log("[freshpress] add these to .env:");
console.log(
  `DATABASE_URL="postgresql://postgres:postgres@${host}:${port}/postgres?sslmode=disable"`,
);
console.log("DATABASE_DRIVER=pg");

async function shutdown(signal: string) {
  console.log(`\n[freshpress] ${signal} received — shutting down PGlite`);
  try {
    await server.stop();
    await db.close();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));