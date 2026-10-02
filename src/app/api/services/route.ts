import { NextResponse } from "next/server";

import { getActiveServicesByIds, listServices } from "@/db/services";

/**
 * Public catalogue endpoint.
 *
 * Used by the cart provider to price a **guest** cart: guests keep only
 * `{ serviceId, quantity }` in `localStorage`, so prices are always resolved from the
 * database here rather than being stored in the browser.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 30);

  try {
    if (ids.length > 0) {
      const services = await getActiveServicesByIds(ids);

      return NextResponse.json({
        services: services.map((service) => ({
          id: service.id,
          name: service.name,
          slug: service.slug,
          price: service.price,
          imageUrl: service.imageUrl,
        })),
      });
    }

    const categorySlug = searchParams.get("category") ?? undefined;
    const services = await listServices({ categorySlug: categorySlug || undefined });

    return NextResponse.json({ services });
  } catch (error) {
    console.error("[freshpress] failed to load services", error);

    return NextResponse.json(
      { error: "We could not load the service catalogue." },
      { status: 500 },
    );
  }
}