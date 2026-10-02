import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Consistent eyebrow + heading + optional description block for page sections. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  as: Heading = "h2",
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "start";
  as?: "h1" | "h2" | "h3";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <Heading className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        {title}
      </Heading>
      {description ? (
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}