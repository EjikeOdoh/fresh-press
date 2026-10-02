import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration.
 *
 * `drizzle-kit generate` is fully offline — it only compares the schema with the
 * committed migration snapshots. `drizzle-kit migrate` / `push` / `studio` require a
 * reachable database, so `DATABASE_URL` must be set in `.env` for those commands.
 */
export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  strict: true,
  verbose: true,
  dbCredentials: {
    // A syntactically valid placeholder keeps `generate` working without credentials.
    // `migrate`/`push`/`studio` will fail fast if the real DATABASE_URL is missing.
    url:
      process.env.DATABASE_URL ??
      "postgresql://placeholder:placeholder@localhost:5432/freshpress",
  },
});