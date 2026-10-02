import { AlertCircle, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  FinalCta,
  Hero,
  HowItWorks,
  PickupAndDelivery,
  Testimonials,
  WhyChooseFreshPress,
} from "@/components/home/home-sections";
import { SectionHeading } from "@/components/section-heading";
import { ServiceCard } from "@/components/service-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { listFeaturedServices, type ServiceListItem } from "@/db/services";
import { FEATURED_SERVICE_COUNT, SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  let services: ServiceListItem[] = [];
  let catalogueUnavailable = false;

  try {
    services = await listFeaturedServices(FEATURED_SERVICE_COUNT);
  } catch (error) {
    console.error("[freshpress] failed to load featured services", error);
    catalogueUnavailable = true;
  }

  return (
    <>
      <Hero />

      <section
        id="featured-services"
        className="container-page scroll-mt-20 py-16 lg:py-20"
      >
        <SectionHeading
          eyebrow="Popular services"
          title="Featured cleaning services"
          description="Everyday favourites from our catalogue. Prices are per item and include free pickup and delivery."
        />

        <div className="mt-12">
          {catalogueUnavailable ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Our catalogue is temporarily unavailable</AlertTitle>
              <AlertDescription>
                We could not load our services just now. Please refresh the page in
                a moment, or contact us at {SITE.email} and we will help you
                book by phone.
              </AlertDescription>
            </Alert>
          ) : services.length === 0 ? (
            <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
              <Sparkles className="text-muted-foreground size-6" aria-hidden="true" />
              <p className="font-medium">Our catalogue is being updated</p>
              <p className="text-muted-foreground text-sm">
                New cleaning services are added regularly. Please check back soon.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/services">View all services &amp; prices</Link>
          </Button>
        </div>
      </section>

      <HowItWorks />
      <WhyChooseFreshPress />
      <PickupAndDelivery />
      <Testimonials />
      <FinalCta />
    </>
  );
}