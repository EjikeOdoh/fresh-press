/**
 * Verify the FreshPress database connection, schema and seed against Neon.
 *
 *   npm run db:verify
 *
 * Exits non-zero when the database is unreachable, the migration has not been
 * applied, or the catalogue seed is missing.
 */
import { sql, type SQL } from "drizzle-orm";

import { getDb } from "../src/db";

type Row = Record<string, unknown>;

async function rows(query: SQL): Promise<Row[]> {
  const result: unknown = await getDb().execute(query);
  if (Array.isArray(result)) {
    return result as Row[];
  }
  return (result as { rows?: Row[] }).rows ?? [];
}

async function main() {
  const [ping] = await rows(sql`select 1 as ok`);
  if (Number(ping?.ok) !== 1) {
    throw new Error("Connectivity check failed (select 1 returned nothing)");
  }
  console.log("[verify] connected to Neon");

  const tables = await rows(
    sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
  );
  const tableNames = tables.map((row) => String(row.table_name));
  const required = [
    "service_categories",
    "services",
    "carts",
    "cart_items",
    "orders",
    "order_items",
  ];
  const missing = required.filter((name) => !tableNames.includes(name));
  if (missing.length > 0) {
    throw new Error(
      `Missing tables: ${missing.join(", ")} — run \`npm run db:migrate\``,
    );
  }
  console.log(`[verify] schema applied (${tableNames.length} public tables)`);

  const [counts] = await rows(
    sql`select (select count(*) from service_categories)::int as categories, (select count(*) from services)::int as services`,
  );
  const categories = Number(counts?.categories ?? 0);
  const services = Number(counts?.services ?? 0);
  if (categories < 1 || services < 1) {
    throw new Error("Catalogue is empty — run `npm run db:seed`");
  }
  console.log(
    `[verify] seed present (${categories} categories, ${services} services)`,
  );
  console.log("[verify] OK");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[verify] FAILED");
    console.error(error);
    process.exit(1);
  });