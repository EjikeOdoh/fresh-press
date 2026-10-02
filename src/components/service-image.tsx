"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Catalogue artwork with a graceful fallback.
 *
 * Artwork is generated on demand (`/service-images/<slug>`), so there is never a missing
 * asset; if a remote image URL were ever configured and failed to load, the branded
 * gradient below keeps the layout intact.
 */
export function ServiceImage({
  src,
  alt,
  className,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "from-primary/25 via-primary/10 to-accent grid place-items-center bg-gradient-to-br",
          className,
        )}
      >
        <span className="text-primary/70 text-2xl font-semibold tracking-tight">
          FP
        </span>
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={src.startsWith("/service-images/")}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}