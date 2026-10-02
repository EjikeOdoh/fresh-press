import {
  BadgeCheck,
  CalendarClock,
  Leaf,
  PackageCheck,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  Truck,
  WashingMachine,
} from "lucide-react";
import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DELIVERY_FEE_NAIRA, SITE, TIME_SLOTS } from "@/lib/config";
import { formatNaira } from "@/lib/money";

/** Hero section: business name, headline and the two primary calls to action. */
export function Hero() {
  return (
    <section className="from-primary/10 via-background to-background relative overflow-hidden bg-gradient-to-b">
      <div
        aria-hidden="true"
        className="bg-primary/10 absolute -top-24 -right-24 size-72 rounded-full blur-3xl"
      />
      <div className="container-page relative grid gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <p className="border-primary/20 bg-background text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide">
            <Truck className="size-3.5" aria-hidden="true" />
            Free pickup &amp; delivery across Lagos
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {SITE.tagline}
          </h1>
          <p className="text-muted-foreground max-w-xl text-base leading-relaxed sm:text-lg">
            {SITE.name} collects your clothes, professionally cleans, presses and
            delivers them back — usually within 48 hours. Schedule a pickup in
            minutes and track every order from your account.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/services">Book a Cleaning</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/services">View Services</Link>
            </Button>
          </div>
          <dl className="grid w-full grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
            {[
              { term: "Pickup & delivery", detail: "Included on every order" },
              { term: "Turnaround", detail: "24–48 hours" },
              { term: "Garment care", detail: "Inspected & pressed" },
            ].map((item) => (
              <div key={item.term} className="border-border border-l-2 pl-3">
                <dt className="text-sm font-semibold">{item.term}</dt>
                <dd className="text-muted-foreground text-xs">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Card className="border-primary/15 gap-0 overflow-hidden shadow-lg">
          <div className="from-primary to-primary/70 text-primary-foreground flex items-center gap-3 bg-gradient-to-br px-6 py-5">
            <Shirt className="size-5" aria-hidden="true" />
            <p className="text-sm font-semibold">What we clean</p>
          </div>
          <CardContent className="grid gap-4 px-6 py-6 sm:grid-cols-2">
            {[
              { label: "Dry cleaning", detail: "Suits, dresses, blazers" },
              { label: "Wash & fold", detail: "Everyday laundry" },
              { label: "Ironing", detail: "Crisp professional press" },
              { label: "Deep cleaning", detail: "Curtains & blankets" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <BadgeCheck
                  className="text-primary mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-muted-foreground text-xs">{item.detail}</p>
                </div>
              </div>
            ))}
            <div className="sm:col-span-2">
              <Button asChild variant="secondary" className="w-full">
                <Link href="/services">Browse the catalogue</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
const STEPS = [
  {
    icon: CalendarClock,
    title: "1. Book & schedule",
    description:
      "Choose the items you need cleaned and pick a pickup date and time slot that suits you.",
  },
  {
    icon: Truck,
    title: "2. We pick up",
    description:
      "Our courier collects your items from your address — pickup and delivery are free.",
  },
  {
    icon: WashingMachine,
    title: "3. We clean & press",
    description:
      "Expert dry cleaning, wash & fold, ironing or deep cleaning, followed by a quality check.",
  },
  {
    icon: PackageCheck,
    title: "4. We deliver",
    description:
      "Your fresh clothes come back neatly packed, on the delivery date and slot you chose.",
  },
];

/** Four-step explanation of the service. */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="container-page scroll-mt-20 py-16 lg:py-20"
    >
      <SectionHeading
        eyebrow="How it works"
        title="Clean clothes without leaving your home"
        description="Four simple steps from booking to a fresh wardrobe. No queues, no traffic, no hassle."
      />
      <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <li key={step.title}>
            <Card className="h-full">
              <CardContent className="flex flex-col gap-3">
                <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-xl">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-base font-semibold">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
const REASONS = [
  {
    icon: Leaf,
    title: "Eco-friendly cleaning",
    description:
      "Gentle, biodegradable solvents that protect fabrics and the environment.",
  },
  {
    icon: Sparkles,
    title: "Expert garment care",
    description:
      "Stains treated by hand, buttons and seams inspected, everything individually pressed.",
  },
  {
    icon: Truck,
    title: "Free pickup & delivery",
    description:
      "Door-to-door collection and return across our Lagos service area at no cost.",
  },
  {
    icon: ShieldCheck,
    title: "Satisfaction guarantee",
    description:
      "Not happy with a garment? Tell us within 48 hours and we will re-clean it free.",
  },
];

/** Value proposition section. */
export function WhyChooseFreshPress() {
  return (
    <section
      id="why-freshpress"
      className="bg-muted/40 scroll-mt-20 py-16 lg:py-20"
    >
      <div className="container-page">
        <SectionHeading
          eyebrow="Why FreshPress"
          title="Premium care, dependable service"
          description="We treat every garment like it is our own — and every customer like a neighbour."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((reason) => (
            <Card key={reason.title} className="h-full">
              <CardContent className="flex flex-col gap-3">
                <span className="bg-background text-primary grid size-11 place-items-center rounded-xl shadow-sm">
                  <reason.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-base font-semibold">{reason.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {reason.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Pickup & delivery explanation, including the available time slots and delivery fee. */
export function PickupAndDelivery() {
  return (
    <section id="pickup-delivery" className="container-page scroll-mt-20 py-16 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-6">
          <SectionHeading
            align="start"
            eyebrow="Pickup & delivery"
            title="We come to you — twice"
            description="Schedule a free pickup, then choose when your clean clothes come back. Our couriers cover our Lagos service area every weekday and Saturday."
          />
          <ul className="grid gap-3">
            {TIME_SLOTS.map((slot) => (
              <li
                key={slot.value}
                className="border-border bg-background flex items-center gap-3 rounded-xl border p-4"
              >
                <CalendarClock className="text-primary size-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">{slot.label}</p>
                  <p className="text-muted-foreground text-xs">{slot.window}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-sm">
            A flat delivery fee of{" "}
            <span className="text-foreground font-semibold">
              {formatNaira(DELIVERY_FEE_NAIRA)}
            </span>{" "}
            is added at checkout and shown on every order before you place it.
          </p>
        </div>

        <Card className="from-primary/10 to-background border-primary/15 gap-0 overflow-hidden bg-gradient-to-br">
          <CardContent className="flex flex-col gap-5 px-6 py-8 sm:px-8">
            <h3 className="text-xl font-semibold">Book in under two minutes</h3>
            <ol className="grid gap-3 text-sm">
              {[
                "Add the items you need cleaned to your cart.",
                "Sign in with Google so we can save your order.",
                "Confirm pickup and delivery dates and slots.",
                "Review the total and place your order.",
              ].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="bg-primary text-primary-foreground grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
            <Button asChild size="lg">
              <Link href="/services">Start your order</Link>
            </Button>
            <p className="text-muted-foreground text-xs">
              Questions? Email{" "}
              <a className="underline" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>{" "}
              or call {SITE.phone}.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
const TESTIMONIALS = [
  {
    quote:
      "FreshPress returned my suits better than any dry cleaner I have used. The pickup was on time and the delivery slot was exactly what I chose.",
    name: "Adeola O.",
    role: "Victoria Island",
  },
  {
    quote:
      "The wash & fold service is a lifesaver. I schedule on Sunday evening and everything is back by Tuesday, folded properly.",
    name: "Chinedu E.",
    role: "Lekki Phase 1",
  },
  {
    quote:
      "I had a stubborn stain on a silk dress and it came back looking new. Booking online took me two minutes.",
    name: "Fatima B.",
    role: "Ikoyi",
  },
];

/** Demo social proof. Clearly labelled as demonstration content in the footer. */
export function Testimonials() {
  return (
    <section className="bg-muted/40 py-16 lg:py-20">
      <div className="container-page">
        <SectionHeading
          eyebrow="Customer stories"
          title="Loved by households across Lagos"
          description="Demo testimonials shown for illustration."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <Card key={testimonial.name} className="h-full">
              <CardContent className="flex h-full flex-col gap-4">
                <div className="flex gap-1" aria-label="Rated 5 out of 5">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <Star
                      key={index}
                      className="fill-primary text-primary size-4"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <blockquote className="text-sm leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="mt-auto flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="bg-primary/10 text-primary grid size-9 place-items-center rounded-full text-xs font-semibold"
                  >
                    {testimonial.name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{testimonial.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {testimonial.role}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    Verified demo
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Closing call to action. */
export function FinalCta() {
  return (
    <section className="container-page py-16 lg:py-20">
      <div className="from-primary to-primary/80 text-primary-foreground relative overflow-hidden rounded-2xl bg-gradient-to-br px-6 py-12 text-center sm:px-12">
        <div
          aria-hidden="true"
          className="absolute -top-16 -right-10 size-48 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Ready for your freshest laundry yet?
          </h2>
          <p className="text-sm leading-relaxed opacity-90 sm:text-base">
            Build your order, choose a pickup window, and let {SITE.name} handle
            the rest. Free pickup and delivery on every order.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary">
              <Link href="/services">Book a Cleaning</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
            >
              <Link href="/account/orders">View my orders</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}