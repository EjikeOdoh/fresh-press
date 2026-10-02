import { NextResponse } from "next/server";

/**
 * Deterministic, dependency-free demo artwork for catalogue items.
 *
 * Real photography is out of scope for this assignment, so each service is illustrated
 * with an on-brand generated SVG (`/service-images/<slug>`). The URL is stored in
 * `services.image_url`, which keeps the database as the source of truth for what the UI
 * renders — no service imagery is hard-coded in components.
 *
 * The same route is used for category headers (`/service-images/category-<slug>`).
 */

type Artwork = {
  icon: string;
  from: string;
  to: string;
};

const DEFAULT_ARTWORK: Artwork = {
  icon: "hanger",
  from: "#0f766e",
  to: "#14b8a6",
};

const ARTWORK_BY_KEY: Record<string, Artwork> = {
  "shirt-dry-clean": { icon: "shirt", from: "#0e7490", to: "#22d3ee" },
  "trousers-dry-clean": { icon: "trousers", from: "#1e3a8a", to: "#3b82f6" },
  "dress-dry-clean": { icon: "dress", from: "#9d174d", to: "#f472b6" },
  "suit-dry-clean": { icon: "suit", from: "#111827", to: "#4b5563" },
  "blazer-dry-clean": { icon: "suit", from: "#4c1d95", to: "#8b5cf6" },
  "skirt-dry-clean": { icon: "skirt", from: "#b45309", to: "#fbbf24" },
  "t-shirt-wash-and-iron": { icon: "shirt", from: "#0f766e", to: "#34d399" },
  "jeans-wash-and-iron": { icon: "trousers", from: "#1d4ed8", to: "#60a5fa" },
  "bedsheet-wash-and-fold": { icon: "bed", from: "#065f46", to: "#2dd4bf" },
  "shirt-iron-only": { icon: "iron", from: "#7c2d12", to: "#fb923c" },
  "curtain-deep-clean": { icon: "curtain", from: "#155e75", to: "#67e8f9" },
  "blanket-deep-clean": { icon: "bed", from: "#312e81", to: "#818cf8" },
  "category-dry-cleaning": { icon: "hanger", from: "#0e7490", to: "#22d3ee" },
  "category-wash-and-fold": { icon: "shirt", from: "#0f766e", to: "#34d399" },
  "category-ironing": { icon: "iron", from: "#7c2d12", to: "#fb923c" },
  "category-deep-cleaning": { icon: "bed", from: "#065f46", to: "#2dd4bf" },
};

/** Minimal line-art paths, drawn inside a 64×64 view box. */
const ICON_PATHS: Record<string, string> = {
  shirt:
    "M22 12 12 16 9 24l6 2v22h34V26l6-2-3-8-10-4-5 6h-10z",
  hanger: "M32 12a5 5 0 1 0-5 5v3L8 34l6 6 18-8 18 8 6-6-19-14v-3",
  trousers: "M16 10h32l-3 46H35l-3-30-3 30H19z",
  dress: "M26 8h12l-2 12 12 34H16l12-34z",
  suit: "M32 10l-14 6v42h28V16zM32 10l-5 14 5 6 5-6z",
  skirt: "M20 14h24l6 38H14z",
  iron: "M10 46h44a6 6 0 0 0-6-6H18l4-12h18a8 8 0 0 0-8-8H20",
  bed: "M10 46V22h8v6h30a8 8 0 0 1 8 8v10M10 34h44",
  curtain: "M12 10h40v6c-6 0-10 6-10 14v24h-6V30c0-8-4-14-10-14s-10 6-10 14v24h-6V30c0-8-4-14-10-14z",
};

function renderArtwork(artwork: Artwork): string {
  const path = ICON_PATHS[artwork.icon] ?? ICON_PATHS.hanger;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${artwork.from}" />
      <stop offset="100%" stop-color="${artwork.to}" />
    </linearGradient>
  </defs>
  <rect width="640" height="420" fill="url(#bg)" />
  <circle cx="520" cy="80" r="120" fill="#ffffff" opacity="0.10" />
  <circle cx="120" cy="360" r="150" fill="#ffffff" opacity="0.08" />
  <g transform="translate(256 146) scale(2)" fill="none" stroke="#ffffff" stroke-width="2.6"
     stroke-linecap="round" stroke-linejoin="round" opacity="0.92">
    <path d="${path}" />
  </g>
</svg>`;
}

export function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  return params.then(({ slug }) => {
    const artwork = ARTWORK_BY_KEY[slug] ?? DEFAULT_ARTWORK;

    return new NextResponse(renderArtwork(artwork), {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      },
    });
  });
}