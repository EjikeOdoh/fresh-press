/**
 * Idempotent seed data for the FreshPress service catalogue.
 *
 * Running this script repeatedly must never create duplicates: categories and services are
 * matched by their unique `slug` and updated in place.
 *
 *   npm run db:seed
 */
import { getDb, type Database } from "./index";
import { serviceCategories, services } from "./schema";

export type CategorySeed = {
  name: string;
  slug: string;
  description: string;
};

export type ServiceSeed = {
  categorySlug: string;
  name: string;
  slug: string;
  description: string;
  /** Integer naira. */
  price: number;
};

export const CATEGORY_SEED: readonly CategorySeed[] = [
  {
    name: "Dry Cleaning",
    slug: "dry-cleaning",
    description:
      "Gentle solvent cleaning for suits, dresses, blazers and other delicate garments.",
  },
  {
    name: "Wash & Fold",
    slug: "wash-and-fold",
    description:
      "Everyday laundry washed, dried and neatly folded or pressed, ready to wear.",
  },
  {
    name: "Ironing",
    slug: "ironing",
    description:
      "Professional pressing and finishing for clothes that are already clean.",
  },
  {
    name: "Deep Cleaning",
    slug: "deep-cleaning",
    description:
      "Intensive treatment for bulky household items such as curtains and blankets.",
  },
];

/** Demo artwork is generated on demand from the slug (see `service-images/[slug]`). */
export function serviceImageUrl(slug: string): string {
  return `/service-images/${slug}`;
}

export const SERVICE_SEED: readonly ServiceSeed[] = [
  {
    categorySlug: "dry-cleaning",
    name: "Shirt",
    slug: "shirt-dry-clean",
    description:
      "Classic dry clean for cotton and blend shirts: solvent wash, collar and cuff treatment, crisp press.",
    price: 1000,
  },
  {
    categorySlug: "dry-cleaning",
    name: "Trousers",
    slug: "trousers-dry-clean",
    description:
      "Dry cleaned and pressed with a sharp crease. Suitable for suit trousers and chinos.",
    price: 1500,
  },
  {
    categorySlug: "dry-cleaning",
    name: "Dress",
    slug: "dress-dry-clean",
    description:
      "Delicate dry clean for dresses, including embellished and lined pieces. Hand-finished press.",
    price: 2500,
  },
  {
    categorySlug: "dry-cleaning",
    name: "Suit",
    slug: "suit-dry-clean",
    description:
      "Two-piece suit dry cleaned as a set, with shape retention pressing and button inspection.",
    price: 4000,
  },
  {
    categorySlug: "dry-cleaning",
    name: "Blazer",
    slug: "blazer-dry-clean",
    description:
      "Structured blazer dry clean with shoulder care, lining refresh and steam finish.",
    price: 2500,
  },
  {
    categorySlug: "dry-cleaning",
    name: "Skirt",
    slug: "skirt-dry-clean",
    description:
      "Dry clean and press for skirts of all lengths, pleats re-set by hand where needed.",
    price: 1200,
  },
  {
    categorySlug: "wash-and-fold",
    name: "T-Shirt",
    slug: "t-shirt-wash-and-iron",
    description:
      "Wash & iron for everyday T-shirts: colour-safe wash, soft dry, neatly pressed.",
    price: 800,
  },
  {
    categorySlug: "wash-and-fold",
    name: "Jeans",
    slug: "jeans-wash-and-iron",
    description:
      "Wash & iron for denim, cleaned inside out to protect the colour and finished flat.",
    price: 1200,
  },
  {
    categorySlug: "wash-and-fold",
    name: "Bedsheet",
    slug: "bedsheet-wash-and-fold",
    description:
      "Wash & fold for bed sheets and duvet covers: high-temperature wash, folded for storage.",
    price: 2000,
  },
  {
    categorySlug: "ironing",
    name: "Shirt",
    slug: "shirt-iron-only",
    description:
      "Iron only for already-clean shirts. Professional press with a crisp collar and cuffs.",
    price: 500,
  },
  {
    categorySlug: "deep-cleaning",
    name: "Curtain",
    slug: "curtain-deep-clean",
    description:
      "Deep clean for curtains and drapes: dust extraction, deep wash and careful drying.",
    price: 3500,
  },
  {
    categorySlug: "deep-cleaning",
    name: "Blanket",
    slug: "blanket-deep-clean",
    description:
      "Deep clean for blankets and duvets: sanitising wash, full rinse and low-heat drying.",
    price: 3000,
  },
];
/**
 * Upsert every category and service. Safe to run repeatedly.
 */
export async function seedDatabase(db: Database = getDb()) {
  const categoryIdBySlug = new Map<string, string>();

  for (const category of CATEGORY_SEED) {
    const [row] = await db
      .insert(serviceCategories)
      .values(category)
      .onConflictDoUpdate({
        target: serviceCategories.slug,
        set: { name: category.name, description: category.description },
      })
      .returning({ id: serviceCategories.id, slug: serviceCategories.slug });

    if (!row) {
      throw new Error(`Failed to seed category "${category.slug}"`);
    }

    categoryIdBySlug.set(row.slug, row.id);
  }

  for (const service of SERVICE_SEED) {
    const categoryId = categoryIdBySlug.get(service.categorySlug);

    if (!categoryId) {
      throw new Error(
        `Service "${service.slug}" references unknown category "${service.categorySlug}"`,
      );
    }

    const values = {
      categoryId,
      name: service.name,
      slug: service.slug,
      description: service.description,
      price: service.price,
      imageUrl: serviceImageUrl(service.slug),
      isActive: true,
    };

    await db
      .insert(services)
      .values(values)
      .onConflictDoUpdate({
        target: services.slug,
        set: { ...values, updatedAt: new Date() },
      });
  }

  return {
    categories: CATEGORY_SEED.length,
    services: SERVICE_SEED.length,
  };
}

async function main() {
  const result = await seedDatabase();

  console.log(
    `[freshpress] seeded ${result.categories} categories and ${result.services} services`,
  );
}

const invokedPath = process.argv[1] ?? "";

if (/(^|[\\/])seed\.(ts|js|mts|mjs)$/.test(invokedPath)) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("[freshpress] seed failed");
      console.error(error);
      process.exit(1);
    });
}