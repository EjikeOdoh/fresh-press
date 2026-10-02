import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { getDb, type Database } from "./index";
import { serviceCategories, services } from "./schema";

/**
 * Read helpers for the catalogue. Prices always come from these queries — never from a
 * component, and never from a request body.
 */

export type ServiceListItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** Integer naira. */
  price: number;
  imageUrl: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
};

export type ServiceCategorySummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  serviceCount: number;
};

const serviceColumns = {
  id: services.id,
  name: services.name,
  slug: services.slug,
  description: services.description,
  price: services.price,
  imageUrl: services.imageUrl,
  categoryId: serviceCategories.id,
  categoryName: serviceCategories.name,
  categorySlug: serviceCategories.slug,
};

type ServiceRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  imageUrl: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
};

function toServiceListItem(row: ServiceRow): ServiceListItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    imageUrl: row.imageUrl,
    category: {
      id: row.categoryId,
      name: row.categoryName,
      slug: row.categorySlug,
    },
  };
}

export async function listCategories(
  db: Database = getDb(),
): Promise<ServiceCategorySummary[]> {
  const rows = await db
    .select({
      id: serviceCategories.id,
      name: serviceCategories.name,
      slug: serviceCategories.slug,
      description: serviceCategories.description,
      serviceCount: db.$count(
        services,
        and(
          eq(services.categoryId, serviceCategories.id),
          eq(services.isActive, true),
        ),
      ),
    })
    .from(serviceCategories)
    .orderBy(asc(serviceCategories.name));

  return rows;
}

export async function listServices(
  options: { categorySlug?: string; limit?: number } = {},
  db: Database = getDb(),
): Promise<ServiceListItem[]> {
  const conditions = [eq(services.isActive, true)];

  if (options.categorySlug) {
    conditions.push(eq(serviceCategories.slug, options.categorySlug));
  }

  const query = db
    .select(serviceColumns)
    .from(services)
    .innerJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
    .where(and(...conditions))
    .orderBy(asc(serviceCategories.name), asc(services.price));

  const rows = options.limit ? await query.limit(options.limit) : await query;

  return rows.map(toServiceListItem);
}

/** Newest active services — used by the home page "featured" section. */
export async function listFeaturedServices(
  limit: number,
  db: Database = getDb(),
): Promise<ServiceListItem[]> {
  const rows = await db
    .select(serviceColumns)
    .from(services)
    .innerJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
    .where(eq(services.isActive, true))
    .orderBy(desc(services.createdAt), asc(services.price))
    .limit(limit);

  return rows.map(toServiceListItem);
}

export async function getServiceBySlug(
  slug: string,
  db: Database = getDb(),
): Promise<ServiceListItem | null> {
  const [row] = await db
    .select(serviceColumns)
    .from(services)
    .innerJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
    .where(and(eq(services.slug, slug), eq(services.isActive, true)))
    .limit(1);

  return row ? toServiceListItem(row) : null;
}

export async function getActiveServicesByIds(
  ids: readonly string[],
  db: Database = getDb(),
): Promise<ServiceListItem[]> {
  if (ids.length === 0) {
    return [];
  }

  const rows = await db
    .select(serviceColumns)
    .from(services)
    .innerJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
    .where(and(inArray(services.id, [...ids]), eq(services.isActive, true)));

  return rows.map(toServiceListItem);
}

/** Slugs of every active service — used by the sitemap. */
export async function listActiveServiceSlugs(
  db: Database = getDb(),
): Promise<{ slug: string; updatedAt: Date }[]> {
  return db
    .select({ slug: services.slug, updatedAt: services.updatedAt })
    .from(services)
    .where(eq(services.isActive, true));
}