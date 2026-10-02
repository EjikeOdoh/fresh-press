import { PackageSearch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { ServiceCard } from "@/components/service-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listCategories,
  listServices,
  type ServiceCategorySummary,
  type ServiceListItem,
} from "@/db/services";
import { SITE } from "@/lib/config";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cleaning services & prices",
  description: `Browse every ${SITE.name} service — dry cleaning, wash & fold, ironing and deep cleaning — with transparent per-item prices and free pickup and delivery.`,
  alternates: { canonical: "/services" },
};

type ServicesPageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const { category } = await searchParams;
  const activeCategory = category?.trim() || undefined;

  let categories: ServiceCategorySummary[] = [];
  let services: ServiceListItem[] = [];
  let loadFailed = false;

  try {
    [categories, services] = await Promise.all([
      listCategories(),
      listServices({ categorySlug: activeCategory }),
    ]);
  } catch (error) {
    console.error("[freshpress] failed to load the catalogue", error);
    loadFailed = true;
  }

  const activeCategoryName = categories.find(
    (candidate) => candidate.slug === activeCategory,
  )?.name;

  return (
    <div className="container-page py-12 lg:py-16">
      <SectionHeading
        align="start"
        as="h1"
        eyebrow="Service catalogue"
        title={
          activeCategoryName
            ? `${activeCategoryName} services`
            : "All cleaning services"
        }
        description="Prices are per item and always come straight from our live catalogue. Add what you need to your cart, then choose a pickup and delivery window at checkout."
      />

      {!loadFailed && categories.length > 0 ? (
        <nav
          aria-label="Filter by category"
          className="mt-8 flex flex-wrap items-center gap-2"
        >
          <Button
            asChild
            size="sm"
            variant={activeCategory ? "outline" : "default"}
          >
            <Link href="/services">All services</Link>
          </Button>
          {categories.map((item) => (
            <Button
              key={item.id}
              asChild
              size="sm"
              variant={activeCategory === item.slug ? "default" : "outline"}
              className={cn(activeCategory === item.slug && "pointer-events-none")}
            >
              <Link href={`/services?category=${item.slug}`}>
                {item.name}
                <Badge variant="secondary" className="ml-1">
                  {item.serviceCount}
                </Badge>
              </Link>
            </Button>
          ))}
        </nav>
      ) : null}

      <div className="mt-10">
        {loadFailed ? (
          <Alert variant="destructive">
            <AlertTitle>We could not load our services</AlertTitle>
            <AlertDescription>
              Please try again in a moment. If the problem persists, contact us
              at {SITE.email}.
            </AlertDescription>
          </Alert>
        ) : services.length === 0 ? (
          <div className="border-border flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
            <PackageSearch className="text-muted-foreground size-6" aria-hidden="true" />
            <div>
              <p className="font-medium">
                {activeCategory
                  ? "No services in this category yet"
                  : "No services available yet"}
              </p>
              <p className="text-muted-foreground text-sm">
                Try another category or view the full catalogue.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/services">View all services</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-6 text-sm">
              Showing {services.length}{" "}
              {services.length === 1 ? "service" : "services"}
              {activeCategoryName ? ` in ${activeCategoryName}` : ""}.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}