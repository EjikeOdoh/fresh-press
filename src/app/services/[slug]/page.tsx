import { ArrowLeft, CheckCircle2, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ServiceDetailActions } from "@/components/service-detail-actions";
import { ServiceImage } from "@/components/service-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getServiceBySlug } from "@/db/services";
import { DELIVERY_FEE_NAIRA, SITE } from "@/lib/config";
import { formatNaira } from "@/lib/money";

type ServiceDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ServiceDetailPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const service = await getServiceBySlug(slug);

    if (!service) {
      return { title: "Service not found" };
    }

    return {
      title: `${service.name} — ${service.category.name}`,
      description: `${service.description} ${formatNaira(service.price)} per item with free pickup and delivery from ${SITE.name}.`,
      alternates: { canonical: `/services/${service.slug}` },
      openGraph: {
        title: `${service.name} — ${service.category.name} | ${SITE.name}`,
        description: service.description,
        url: `/services/${service.slug}`,
      },
    };
  } catch (error) {
    console.error("[freshpress] failed to build service metadata", error);
    return { title: "Cleaning service" };
  }
}

export default async function ServiceDetailPage({
  params,
}: ServiceDetailPageProps) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  const highlights = [
    "Free pickup and delivery",
    "Individual quality inspection",
    "Ready in 24–48 hours",
  ];

  return (
    <div className="container-page py-10 lg:py-14">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6">
        <Link href="/services">
          <ArrowLeft aria-hidden="true" />
          Back to services
        </Link>
      </Button>

      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="border-border relative aspect-[4/3] w-full overflow-hidden rounded-2xl border">
          <ServiceImage
            src={service.imageUrl}
            alt={`${service.name} — ${service.category.name} at FreshPress`}
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{service.category.name}</Badge>
            <Badge variant="outline">Per item</Badge>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {service.name}
          </h1>

          <p className="text-muted-foreground leading-relaxed">
            {service.description}
          </p>

          <div className="flex items-baseline gap-2">
            <span className="text-primary text-3xl font-semibold">
              {formatNaira(service.price)}
            </span>
            <span className="text-muted-foreground text-sm">per item</span>
          </div>

          <Separator />

          <ServiceDetailActions
            service={{
              id: service.id,
              name: service.name,
              slug: service.slug,
              price: service.price,
              imageUrl: service.imageUrl,
            }}
          />

          <ul className="text-muted-foreground grid gap-2 text-sm">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex items-center gap-2">
                <CheckCircle2 className="text-success size-4" aria-hidden="true" />
                {highlight}
              </li>
            ))}
            <li className="flex items-center gap-2">
              <Truck className="text-primary size-4" aria-hidden="true" />
              Flat delivery fee of {formatNaira(DELIVERY_FEE_NAIRA)} per order
            </li>
          </ul>

          <p className="text-muted-foreground text-xs">
            Care label tip: always check your garment&apos;s care label. If you are
            unsure, add a note in the special instructions at checkout and our team
            will advise.
          </p>
        </div>
      </div>
    </div>
  );
}