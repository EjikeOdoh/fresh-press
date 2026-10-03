# FreshPress Dry Cleaners — Implementation Phases

Roadmap for delivering `docs/PROJECT_SPEC.md`. Phases are sequential and must not be
skipped. After each phase: run the verification commands, fix failures, report
(`Completed / Files Changed / Verification / Issues / Next Phase`) and only then continue.

Current status: see the **Phase Status** table at the bottom of this file (kept up to date
as phases complete).

## Phase 1 — Project Foundation

Goal: a bootable, type-safe, lint-clean Next.js full-stack skeleton wired to
Neon/Postgres through Drizzle, with Better Auth + Google OAuth infrastructure and seeded
demo data.

Work items:

1. Initialise the Next.js App Router project (TypeScript, Tailwind CSS v4, ESLint flat
   config, `src/` directory, `@/*` path alias).
2. Configure Tailwind CSS v4 (`@tailwindcss/postcss`, `globals.css` design tokens) and
   shadcn/ui conventions (`components.json`, `src/lib/utils.ts` `cn()`).
3. Configure Drizzle ORM (`drizzle.config.ts`, `src/db/index.ts`) against Neon PostgreSQL
   using `@neondatabase/serverless` + `drizzle-orm/neon-serverless` (transaction support).
4. Define the application schema (`src/db/schema/app.ts`): categories, services, carts,
   cart_items, orders, order_items + enums, indexes, FKs, unique constraints, checks.
5. Generate Better Auth's schema with the Better Auth CLI into `src/db/schema/auth.ts`
   and wire `src/lib/auth.ts` + the API route handler.
6. Generate the Drizzle migrations into `drizzle/`.
7. Write the idempotent seed script (`src/db/seed.ts`) with the four categories and twelve
   services from the spec.
8. Create `.env.example`, `.gitignore`, `README.md` (initial) and shared config modules
   (`src/lib/config.ts`, `src/lib/money.ts`, `src/lib/order-status.ts`).
9. Add a database verification harness (`scripts/verify-db.ts`) that checks the
   connection, the applied migration and the seed against the Neon database.

Acceptance:

* Project installs.
* Database connects (verified against a real Postgres-compatible database; the Neon URL is
  supplied by the operator).
* Migrations work.
* Seed works.
* Project builds; `npm run typecheck` and `npm run lint` pass.

Deliverables: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`,
`eslint.config.mjs`, `drizzle.config.ts`, `components.json`, `src/db/**`, `src/lib/**`,
`drizzle/**`, `.env.example`.
## Phase 2 — Service Catalogue

Goal: the public, database-driven shopfront.

Work items:

1. Shared UI primitives in `src/components/ui` (button, card, input, label, textarea,
   select, badge, separator, sheet, dropdown-menu, alert, skeleton).
2. Site header (responsive navbar + mobile sheet + account menu) and site footer.
3. Home page `/` with all sections listed in `PROJECT_SPEC.md` §10.1, featured services
   loaded from the database.
4. `/services` with a server-side category filter and service cards;
   `/services/[slug]` detail pages.
5. Add-to-cart control on cards and detail pages.
6. `loading.tsx`, `error.tsx`, `not-found.tsx`, empty states and skeletons.
7. SEO metadata for the public pages.

Acceptance:

* Services are fetched from the database (never hard-coded).
* Service detail routes work; invalid slugs render the not-found page.
* Add-to-cart works from both the list and the detail page.
* Public pages render without JavaScript errors; build passes.

## Phase 3 — Shopping Cart

Goal: a correct cart for guests and signed-in customers.

Work items:

1. Cart state (`src/components/cart/cart-provider.tsx`): guest cart persisted in
   `localStorage` under `freshpress.cart.v1`, authenticated cart persisted in the database.
2. Server-side cart data access (`src/db/cart.ts`) and Server Actions
   (`src/actions/cart.ts`): add, set quantity, increment, decrement, remove, clear, merge.
3. `/cart` page: line items with quantity steppers, remove, subtotal, delivery fee, total,
   empty state and checkout CTA.
4. Guest → authenticated merge on sign-in, followed by a server refresh of the cart.
5. Cart item-count badge in the navbar.

Acceptance:

* Cart behaves correctly (add, increase, decrease, remove).
* Refresh preserves the cart (guest: localStorage; user: database).
* Duplicate items are merged, never duplicated.
* Totals are correct and come from database prices.

## Phase 4 — Google Authentication

Goal: Google sign-in, session persistence, protected routes.

Work items:

1. `/sign-in` page with a Google button (explaining Google is the only provider) and a
   `callbackUrl` round-trip.
2. `authClient.signIn.social({ provider: "google", callbackURL })` and `signOut`.
3. Account menu in the navbar (avatar, name, account, orders, sign out).
4. `src/proxy.ts` optimistic protection for `/account*` and `/checkout*`.
5. Server-side session checks in every protected page, action and route handler.
6. Document the required Google Cloud + environment configuration.

Acceptance:

* Google login works (with real credentials supplied by the operator).
* Logout works.
* Session persists across reloads.
* Signed-out users cannot reach protected pages — enforced on the server.

## Phase 5 — Checkout + Order Creation

Goal: place an order safely.

Work items:

1. `src/lib/validation.ts`: Zod schemas for the checkout form and cart actions, including
   the date and time-slot rules from the spec.
2. `/checkout`: authenticated multi-section form (customer, pickup, delivery, notes),
   inline errors, "delivery same as pickup" checkbox, order review panel, place-order
   button.
3. `src/db/orders.ts`: `createOrder()` inside a single transaction — load cart, load
   prices, recompute line totals/subtotal/fee/total, insert order + items, clear cart,
   commit. Order-number generation with unique-violation retry. Duplicate-submission
   guard.
4. `src/actions/checkout.ts`: session check + Zod validation + `createOrder()` + trigger
   the confirmation email + return the order number.
5. `/checkout/confirmation/[orderNumber]` page with ownership enforcement.
6. Cart cleared and UI updated after a successful order.

Acceptance:

* A valid order is created and visible in the database.
* Invalid data (bad dates, delivery before pickup, bad phone, empty cart) is rejected
  server-side.
* The server determines the final price; client prices cannot influence it.
* The cart is cleared.
* The confirmation page is displayed.
* Duplicate submission (double click / resubmit) does not create two orders.
## Phase 6 — Mailgun

Goal: professional order confirmation emails.

Work items:

1. `src/lib/mailgun.ts`: configured check, REST send via `fetch` + `FormData`, Basic auth,
   typed result (`{ sent: boolean; skipped?: boolean; error?: string }`), server-only.
2. `src/lib/email/order-confirmation.ts`: HTML template (table-safe, inline styles) and
   plain-text fallback generated from the same order data.
3. `src/actions/checkout.ts`: send after the transaction commits; on success record
   `confirmation_email_sent_at`; on failure log and surface a non-fatal warning.
4. Document `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM` and the "no credentials →
   skip + warn" behaviour.

Acceptance:

* The confirmation email is sent when Mailgun is configured (verified by the operator with
  real credentials; locally verified with a mocked transport test).
* All required order details appear in both the HTML and text parts.
* An email failure does not destroy the order (order remains, timestamp stays null,
  failure logged).

## Phase 7 — Customer Account + Orders

Goal: private order history and detail.

Work items:

1. `src/db/orders.ts` read helpers: `listOrdersForUser`, `getOrderForUser` (ownership in
   the query), `countOrdersForUser`.
2. `/account`: profile, order count, total spend, recent orders, sign out.
3. `/account/orders`: full order history with number, date, total, status, item count.
4. `/account/orders/[orderNumber]`: full detail + status timeline.
5. `src/lib/order-status.ts`: labels, ordering, badge styling, timeline-step logic.
6. Empty state for customers with no orders; `notFound()` for other users' orders.

Acceptance:

* A user sees their own orders.
* A user cannot see another user's orders (server-side ownership check → 404).
* Order details are accurate (totals match the stored order, not current prices).

## Phase 8 — UI Polish

Goal: a premium, responsive, accessible, SEO-ready experience.

Work items:

1. Responsive pass across mobile/tablet/desktop for every page.
2. Mobile navigation and account menu refinement (keyboard + Escape + focus behaviour).
3. Loading, empty and error states reviewed everywhere; skeletons for slow data.
4. Accessible controls: labelled fields, `aria-invalid`, `role="alert"` errors, focus
   rings, `sr-only` icon-button labels, semantic landmarks.
5. Visual consistency: shared spacing, typography scale, colour tokens, buttons, cards,
   section headers, footer.
6. SEO: per-page metadata, Open Graph/Twitter, `sitemap.ts`, `robots.ts`, canonical URLs.
7. Security headers in `next.config.ts`.

Acceptance:

* The application looks polished and consistent.
* Desktop, tablet and mobile layouts all work.
* Keyboard navigation and screen-reader affordances are present for interactive controls.

## Phase 9 — Testing + Deployment

Goal: prove the whole flow and ship it.

Work items:

1. Unit tests (`node:test` + `tsx`) for money formatting, order-number generation, Zod
   validation rules (dates, slots, phone) and the checkout total computation.
2. Database integration test against a dedicated Neon test database: apply the
   generated migration, seed the catalogue, run the whole checkout in a transaction,
   assert totals/snapshots/cart clearing, assert duplicate-submission behaviour and
   ownership isolation.
3. `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.
4. Document Neon production setup, Google OAuth production redirect URIs, Mailgun
   production configuration and Vercel deployment.
5. Final `README.md`.
6. Final acceptance checklist (spec §16) and the requirement → implementation mapping.

Acceptance:

* Every original assignment requirement works in production.
* TypeScript, ESLint, tests and the production build all pass.

## Phase Status

| Phase | Description | Status |
| --- | --- | --- |
| 1 | Project Foundation | Complete |
| 2 | Service Catalogue | Complete |
| 3 | Shopping Cart | Complete |
| 4 | Google Authentication | Complete |
| 5 | Checkout + Order Creation | Complete |
| 6 | Mailgun | Complete |
| 7 | Customer Account + Orders | Complete |
| 8 | UI Polish | Complete |
| 9 | Testing + Deployment | Complete |

Status values: `Not started`, `In progress`, `Blocked (needs config)`, `Complete`.
Verification evidence for each phase is recorded in the final report (`README.md` +
`docs/PROJECT_SPEC.md`). The only operator-supplied dependency is live infrastructure
credentials (Neon URL, Google OAuth client, Mailgun keys) — see the final report for the
exact list.
<!-- DOC-END -->