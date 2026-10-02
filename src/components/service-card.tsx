import Link from "next/link";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { ServiceImage } from "@/components/service-image";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ServiceListItem } from "@/db/services";
import { formatNaira } from "@/lib/money";

/** Catalogue card: image, name, description, price, category and Add to cart. */
export function ServiceCard({ service }: { service: ServiceListItem }) {
  return (
    <Card className="group h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <ServiceImage
          src={service.imageUrl}
          alt={`${service.name} — ${service.category.name} at FreshPress`}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <Badge
          variant="secondary"
          className="bg-background/90 absolute top-3 left-3 backdrop-blur"
        >
          {service.category.name}
        </Badge>
      </div>

      <CardHeader className="pt-5">
        <CardTitle className="flex items-baseline justify-between gap-3 text-lg">
          <Link
            href={`/services/${service.slug}`}
            className="hover:text-primary transition-colors"
          >
            {service.name}
          </Link>
          <span className="text-primary text-base font-semibold whitespace-nowrap">
            {formatNaira(service.price)}
          </span>
        </CardTitle>
        <CardDescription className="line-clamp-3 leading-relaxed">
          {service.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <p className="text-muted-foreground text-xs">
          Price per item · pickup &amp; delivery included
        </p>
      </CardContent>

      <CardFooter className="mt-auto flex gap-2 pb-6">
        <AddToCartButton
          service={{
            id: service.id,
            name: service.name,
            slug: service.slug,
            price: service.price,
            imageUrl: service.imageUrl,
          }}
          size="sm"
          className="flex-1"
        />
        <Link
          href={`/services/${service.slug}`}
          className="border-input hover:bg-accent inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors"
        >
          Details
        </Link>
      </CardFooter>
    </Card>
  );
}