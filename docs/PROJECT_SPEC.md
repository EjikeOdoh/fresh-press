# FreshPress Dry Cleaners — Project Specification

> Status: **Approved baseline**. This document is the source of truth for scope, data
> model and business rules. `docs/IMPLEMENTATION_PHASES.md` describes *how* and *in what
> order* the requirements below are delivered. `AGENTS.md` defines the engineering rules.

## 1. Project

**FreshPress Dry Cleaners** — a modern dry-cleaning service booking and order management
website.

## 2. Business Concept

FreshPress is a modern dry-cleaning service. Customers browse cleaning services, select
items and quantities, add them to a cart, schedule pickup and delivery, place an order,
and receive confirmation by email.

The primary flow:

```text
Home
 ↓
Services
 ↓
Select cleaning items
 ↓
Cart
 ↓
Checkout
 ↓
Google Authentication
 ↓
Customer + pickup/delivery details
 ↓
Review Order
 ↓
Place Order
 ↓
Save Order in Neon
 ↓
Send Mailgun Confirmation Email
 ↓
Order Confirmation
 ↓
View Order History
```

### Actors

| Actor | Description |
| --- | --- |
| Guest visitor | Can browse the home page, service catalogue and service detail pages, and keep a temporary (browser-local) cart. |
| Customer | A visitor who has signed in with Google. Has a persistent cart and a private order history. |
| Operations staff | Not modelled in the app. Orders are handled operationally (statuses may be advanced directly in the database). No admin UI is in scope. |

## 3. Technology Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js (App Router) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| UI components | shadcn/ui-style components in `src/components/ui` (Radix primitives + CVA + `cn()`), `lucide-react` icons |
| Auth | Better Auth (`better-auth`) with the Drizzle adapter, Google OAuth only |
| ORM | Drizzle ORM + drizzle-kit |
| Database | Neon PostgreSQL (`@neondatabase/serverless` WebSocket `Pool` driver, which supports real transactions) |
| Validation | Zod |
| Email | Mailgun (REST API over `fetch`, HTML + plain-text) |
| Hosting | Vercel |
| Tests | Node's built-in `node:test` runner (executed via `tsx`) |

The application is a **single Next.js full-stack application**. There is no separate
NestJS (or any other) backend service.

### Why the Neon WebSocket driver (not neon-http)

`drizzle-orm/neon-http` cannot run interactive transactions. Checkout requires order
creation, order items and cart clearing to commit atomically, therefore `src/db/index.ts`
uses `drizzle-orm/neon-serverless` with a `Pool` from `@neondatabase/serverless`
(WebSocket transport, available natively on Node ≥ 22 and on Vercel's Node runtime).
## 4. Core Requirements

The application must:

1. Have a professional customer-facing dry-cleaning website.
2. Display cleaning services from the database.
3. Allow customers to add services/items to a cart.
4. Allow quantity modification.
5. Provide a functional checkout page.
6. Persist application data in Neon PostgreSQL.
7. Authenticate customers using Google OAuth.
8. Send order confirmation emails using Mailgun.
9. Allow authenticated customers to view their previous orders.
10. Work responsively on desktop, tablet and mobile.

## 5. Payment

**No online payment gateway is implemented.** Checkout means: the customer completes the
order and the order is persisted in the database, then confirmation is emailed.

```text
Cart → Checkout → Review → Place Order → Order saved → Email sent → Confirmation
```

Paystack, Flutterwave and Stripe must **not** be added unless explicitly requested later.
Payment is collected on delivery by operations, outside this application.

## 6. Scope Restrictions (explicitly OUT of scope)

Do **not** implement:

* Payment gateway
* Coupons or discount codes
* Wishlist
* Customer review system
* Subscription / recurring plans
* SMS notifications
* Real-time order tracking (map/GPS)
* Complex inventory management
* Full admin dashboard
* Staff role / permission system
* Multi-vendor functionality

Also out of scope: email/password authentication, placing an order while signed out
(Google sign-in is required at checkout), i18n, and any feature that is merely "common in
e-commerce" but not requested here.

## 7. Domain Rules

### 7.1 Service catalogue (seed data)

Categories: `Dry Cleaning`, `Wash & Fold`, `Ironing`, `Deep Cleaning`.

| Service | Category | Price (₦) |
| --- | --- | --- |
| Shirt (dry clean) | Dry Cleaning | 1,000 |
| Trousers | Dry Cleaning | 1,500 |
| Dress | Dry Cleaning | 2,500 |
| Suit | Dry Cleaning | 4,000 |
| Blazer | Dry Cleaning | 2,500 |
| Skirt | Dry Cleaning | 1,200 |
| T-Shirt (wash & iron) | Wash & Fold | 800 |
| Jeans (wash & iron) | Wash & Fold | 1,200 |
| Bedsheet (wash & fold) | Wash & Fold | 2,000 |
| Shirt (iron only) | Ironing | 500 |
| Curtain | Deep Cleaning | 3,500 |
| Blanket | Deep Cleaning | 3,000 |

Notes:

* These are demonstration prices. They are **stored in the database** and must never be
  hard-coded into UI components.
* Two services share the name `Shirt` (`Dry Cleaning` / `Ironing`), so `services.slug`
  encodes the treatment: `shirt-dry-clean` and `shirt-iron-only`. Slugs are unique.
* Each service's `description` carries the treatment wording (dry clean / wash & iron /
  iron only / deep clean) while the category is the canonical grouping.
* The seed script is idempotent: re-running it updates existing rows (matched by slug)
  instead of creating duplicates.

### 7.2 Money representation

* All money is stored as **integer naira** in `integer` columns (`price`, `subtotal`,
  `delivery_fee`, `total`, `unit_price`, `line_total`).
* Display formatting happens exactly once, in `src/lib/money.ts` (`formatNaira`) using
  `Intl.NumberFormat('en-NG')`.
* Money arithmetic is integer-only (`lineTotal = unitPrice * quantity`). Floating point
  arithmetic is never used for money.

### 7.3 Delivery fee

The default delivery fee is **₦1,000**. It is defined once in `src/lib/config.ts` as
`DELIVERY_FEE_NAIRA` and persisted per order in `orders.delivery_fee`. The value is never
duplicated inside UI components.

### 7.4 Pickup & delivery time slots

Defined once in `src/lib/config.ts` (`TIME_SLOTS`) and reused by the checkout form, the
Zod schema, the order review, the confirmation email and the order detail page:

| Value | Label | Window |
| --- | --- | --- |
| `MORNING` | Morning | 9:00 AM – 12:00 PM |
| `AFTERNOON` | Afternoon | 12:00 PM – 3:00 PM |
| `EVENING` | Evening | 3:00 PM – 6:00 PM |

Dates are stored as PostgreSQL `date` (no time component) plus the slot enum. Pickup date
must be today or later; delivery date must be on or after the pickup date.

### 7.5 Order statuses

```text
PENDING
CONFIRMED
PICKED_UP
CLEANING
READY
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
```

Stored as the PostgreSQL enum `order_status`. New orders start as `PENDING`. Each status
has a label, badge styling and description/timeline position in `src/lib/order-status.ts`.
## 8. Database Design (Neon PostgreSQL + Drizzle ORM)

All application tables live in `src/db/schema/`:

* `src/db/schema/index.ts` — re-exports everything (app tables + better-auth tables)
* `src/db/schema/app.ts` — the six application tables below
* `src/db/schema/auth.ts` — the Better Auth tables, **generated by the Better Auth CLI**
  (`user`, `session`, `account`, `verification`). Never hand-invented.

Conventions:

* `uuid` primary keys with `defaultRandom()`.
* `timestamp with time zone` audit columns: `created_at` / `updated_at` (`defaultNow()`,
  `$onUpdate(() => new Date())`).
* Snake_case column names in SQL, camelCase property names in TypeScript (Drizzle
  `snake_case` casing is applied explicitly per column).
* Money columns are `integer` (naira). See §7.2.
* Foreign keys have explicit `onDelete` behaviour. Indexes exist on every FK used for
  lookups and on `orders.user_id`, `orders.order_number` (unique), `services.slug`
  (unique), `service_categories.slug` (unique), `cart_items (cart_id, service_id)`
  (unique) and `orders.confirmation_email_sent_at`.

### 8.1 `service_categories`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default random |
| `name` | text | not null |
| `slug` | text | not null, unique |
| `description` | text | not null |
| `created_at` | timestamptz | not null, default now |
| `updated_at` | timestamptz | not null, default now, on update |

### 8.2 `services`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default random |
| `category_id` | uuid | not null, FK → `service_categories.id`, `on delete restrict` |
| `name` | text | not null |
| `slug` | text | not null, unique |
| `description` | text | not null |
| `price` | integer | not null, `check (price > 0)` — naira |
| `image_url` | text | nullable |
| `is_active` | boolean | not null, default `true` |
| `created_at` | timestamptz | not null, default now |
| `updated_at` | timestamptz | not null, default now, on update |

Index: `services_category_id_idx`. Only `is_active = true` services are listed and can be
added to a cart or ordered.

### 8.3 `carts`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default random |
| `user_id` | text | not null, FK → `user.id` (Better Auth), `on delete cascade`, unique |
| `created_at` | timestamptz | not null, default now |
| `updated_at` | timestamptz | not null, default now, on update |

`user_id` is unique: a signed-in customer has exactly one persistent cart.

### 8.4 `cart_items`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default random |
| `cart_id` | uuid | not null, FK → `carts.id`, `on delete cascade` |
| `service_id` | uuid | not null, FK → `services.id`, `on delete cascade` |
| `quantity` | integer | not null, `check (quantity > 0 && quantity <= 99)` |
| `created_at` | timestamptz | not null, default now |
| `updated_at` | timestamptz | not null, default now, on update |

Unique constraint `cart_items_cart_id_service_id_unique` on `(cart_id, service_id)`:
adding the same service twice merges quantities instead of duplicating rows.

### 8.5 `orders`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default random |
| `order_number` | text | not null, **unique** |
| `user_id` | text | not null, FK → `user.id`, `on delete cascade` |
| `customer_name` | text | not null |
| `customer_email` | text | not null |
| `customer_phone` | text | not null |
| `pickup_address` | text | not null |
| `pickup_date` | date | not null |
| `pickup_time_slot` | `time_slot` enum | not null |
| `delivery_address` | text | not null |
| `delivery_date` | date | not null |
| `delivery_time_slot` | `time_slot` enum | not null |
| `special_instructions` | text | nullable |
| `subtotal` | integer | not null — naira |
| `delivery_fee` | integer | not null — naira |
| `total` | integer | not null — naira |
| `status` | `order_status` enum | not null, default `PENDING` |
| `confirmation_email_sent_at` | timestamptz | nullable |
| `created_at` | timestamptz | not null, default now |
| `updated_at` | timestamptz | not null, default now, on update |

Indexes: `orders_user_id_idx`, `orders_created_at_idx`, unique `orders_order_number_unique`.
Enums: `order_status` (8 values, §7.5) and `time_slot` (`MORNING`, `AFTERNOON`, `EVENING`).

### 8.6 `order_items`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default random |
| `order_id` | uuid | not null, FK → `orders.id`, `on delete cascade` |
| `service_id` | uuid | nullable, FK → `services.id`, `on delete set null` |
| `service_name` | text | not null — **historical snapshot** |
| `unit_price` | integer | not null — **historical snapshot**, naira |
| `quantity` | integer | not null, `check (quantity > 0)` |
| `line_total` | integer | not null (`unit_price * quantity`) |

Index: `order_items_order_id_idx`.

`order_items.service_id` is nullable and `on delete set null` so that removing a service
from the catalogue can never delete or break historical orders. `service_name` and
`unit_price` are copies taken at order time: **an old order must not change when a
service is renamed or re-priced later.**
## 9. Authentication (Better Auth + Google OAuth)

* Provider: **Google only**. No email/password, no magic link, no other social provider.
* Server config: `src/lib/auth.ts` (`betterAuth({...})` with the Drizzle adapter).
* Route handler: `src/app/api/auth/[...all]/route.ts` (`toNextJsHandler(auth)`).
* Client: `src/lib/auth-client.ts` (`createAuthClient()` from `better-auth/react`).
* Plugins: `nextCookies()` so cookies set inside Server Actions are applied by Next.js.
* Auth tables are generated by the Better Auth CLI into `src/db/schema/auth.ts`
  (`user`, `session`, `account`, `verification`) — never hand-invented.
* `user.image` holds the Google profile picture; `user.name` / `user.email` come from
  Google and pre-fill the checkout form.

Environment variables:

```env
BETTER_AUTH_SECRET=      # 32+ char random string — server only
BETTER_AUTH_URL=         # http://localhost:3000 in dev, https://<domain> in prod
GOOGLE_CLIENT_ID=        # server only
GOOGLE_CLIENT_SECRET=    # server only — NEVER exposed to the client
```

OAuth redirect URIs configured in Google Cloud Console:

```text
http://localhost:3000/api/auth/callback/google
https://<production-domain>/api/auth/callback/google
```

Rules:

* `GOOGLE_CLIENT_SECRET` and `BETTER_AUTH_SECRET` are never imported into a client
  module, never prefixed with `NEXT_PUBLIC_`, and never returned by an API route.
* Never place real secrets in `.env.example` or in the repository (`.gitignore` excludes
  `.env*`).
* Route protection has two layers:
  1. `src/proxy.ts` — optimistic redirect for signed-out users visiting `/account*` and
     `/checkout*` (cookie presence only; explicitly **not** a security boundary).
  2. Every protected page, route handler and server action re-validates the session with
     `auth.api.getSession({ headers: await headers() })` and redirects/throws when absent.
## 10. Customer Experience

### 10.1 Home page (`/`)

* **Hero** — business name *FreshPress Dry Cleaners*, headline *Fresh Clothes. Fresh
  Confidence.*, primary CTA **Book a Cleaning** (→ `/services`), secondary CTA
  **View Services** (→ `/services`), plus trust points (free pickup & delivery,
  48-hour turnaround, inspected garments).
* **Featured services** — database-driven (active services, limited set) with prices from
  the database and an Add to Cart control.
* **How it works** — Book & schedule → We pick up → We clean & press → We deliver.
* **Why choose FreshPress** — eco-friendly solvents, expert garment care, free pickup &
  delivery, satisfaction guarantee.
* **Pickup & delivery** — the pickup workflow, the three time slots and the delivery fee
  read from config.
* **Testimonials** — three clearly-labelled demo testimonials.
* **Final CTA** and **Footer** (navigation, demo contact details, opening hours).

### 10.2 Services

* `/services` — all active services, filterable by category with a server-side
  `?category=<slug>` filter, each rendered as a service card.
* `/services/[slug]` — service detail with description, price, category, quantity picker
  and Add to Cart; `notFound()` for unknown or inactive slugs (custom `not-found.tsx`).
* Service cards show: image (meaningful `alt`), name, description, price, category and an
  **Add to Cart** control.
* Loading (`loading.tsx` + skeletons), error (`error.tsx`) and empty states are provided.

### 10.3 Cart (`/cart`)

Customers can add an item, increase quantity, decrease quantity, remove an item, and see
subtotal, delivery fee and total.

* **Guests** get a browser-local cart (`localStorage`, key `freshpress.cart.v1`) that
  survives a refresh. It only ever persists `{ serviceId, quantity }` — never prices the
  server would trust.
* **Signed-in customers** get a persistent cart in `carts` / `cart_items` (exactly one
  cart per user) manipulated through Server Actions that resolve `userId` from the
  session.
* **Merge on sign-in**: when a guest with local items signs in, those items are merged
  into the database cart (quantities summed, capped at 99) and the local cart is cleared.
* Duplicate services never create duplicate rows (unique `(cart_id, service_id)`).
* Totals are computed from database prices. The client never sends prices to the server.

### 10.4 Checkout (`/checkout`)

Google authentication is required: a signed-out visitor is redirected to `/sign-in` with
a `callbackUrl` back to `/checkout`.

Collected fields: full name, email, phone number, pickup address, pickup date, pickup
time slot, delivery address, delivery date, delivery time slot, special instructions —
plus a **Delivery address is same as pickup address** convenience checkbox.

Validation rules (Zod, enforced in the browser for UX and on the server for authority):

* Dates must be `YYYY-MM-DD`, not in the past, and not more than 90 days ahead.
* Delivery date must be on or after the pickup date.
* Phone must be a Nigerian-friendly number (`+234…`, `0…`), 10–15 digits.
* Addresses: 5–300 characters. Special instructions: optional, ≤ 500 characters.
* An empty cart cannot be submitted.

The review section shows items, quantities, unit prices, line totals, subtotal, delivery
fee, total, pickup information, delivery information and special instructions before the
**Place Order** button.
#### Critical security rule — never trust client prices or totals

`createOrder()` (`src/actions/checkout.ts` → `src/db/orders.ts`) must:

1. Verify authentication (Better Auth session from request headers).
2. Validate the checkout input with Zod.
3. Load the user's cart **from the database**.
4. Load current service prices **from the database** (`is_active = true`).
5. Recalculate every line total (`unitPrice * quantity`).
6. Calculate the subtotal.
7. Calculate the delivery fee (from `DELIVERY_FEE_NAIRA`).
8. Create the order.
9. Create the order items (with name/price snapshots).
10. Clear the cart.
11. Commit the transaction.

The checkout payload contains **no** price, subtotal, delivery fee or total fields at all,
so there is nothing client-side for the server to trust or ignore.

#### Order numbers

Human readable and unique: `FP-YYYYMMDD-NNN` (e.g. `FP-20261002-001`). The sequence `NNN`
is the number of orders already created that day + 1, zero-padded to 3 digits, and the
`orders.order_number` unique constraint is the final authority — the insert is retried on
a unique violation (up to 5 attempts) and falls back to a random suffix. Uniqueness never
depends on the date alone.

#### Duplicate submissions

* The client disables the submit button while the action is pending (`useTransition`).
* The server refuses to create an order from an empty cart. If a repeated submission
  arrives for a user whose cart is now empty and that user created an order within the
  last 10 minutes, the server returns that existing order instead of creating a new one
  (idempotent behaviour for double clicks, refreshes and retries).
* The unique constraint on `orders.order_number` prevents collisions.

### 10.5 Order confirmation (`/checkout/confirmation/[orderNumber]`)

Shows the order number, status, itemised totals, pickup and delivery details, the notified
email address, the email-delivery state, and links to
`/account/orders/[orderNumber]` and `/services`. Reachable only by the order's owner
(server-side ownership check); anyone else gets a 404.

## 11. Mailgun

Order confirmation email sent after the order transaction has committed.

Environment variables:

```env
MAILGUN_API_KEY=    # server only
MAILGUN_DOMAIN=     # e.g. mg.freshpress.example
MAILGUN_FROM=       # e.g. FreshPress Dry Cleaners <orders@mg.freshpress.example>
```

Implementation notes:

* `src/lib/mailgun.ts` posts to `https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages`
  using the platform `fetch` + `FormData` and HTTP Basic auth (`api:{MAILGUN_API_KEY}`).
* The message always contains both an **HTML** body and a **plain-text fallback**.
* The email contains: customer name, order number, items, quantities, unit prices, line
  totals, subtotal, delivery fee, total, pickup date/time, pickup address, delivery
  date/time, delivery address and special instructions.
* When Mailgun is not configured (missing env vars) the send is skipped and logged as a
  warning: order placement still succeeds. This is what makes local development possible
  before Mailgun credentials exist.
* Failure handling: the send happens **after** the transaction commits, inside a
  `try/catch`. On success the server writes `orders.confirmation_email_sent_at`. On
  failure it logs the error and returns a warning — the order is **never** rolled back or
  deleted.

## 12. Customer Account

```text
/account
/account/orders
/account/orders/[orderNumber]
```

* `/account` — profile card (name, email, profile image from Google), order count, total
  spend, most recent orders, sign-out.
* `/account/orders` — order history table/cards: order number, date, total, status,
  item count, link to detail.
* `/account/orders/[orderNumber]` — full order detail: status timeline, items with
  quantities/unit prices/line totals, totals, pickup and delivery information, special
  instructions, email-delivery state.
* Ownership is enforced in the SQL query itself
  (`where user_id = session.user.id and order_number = ?`). A mismatch returns
  `notFound()`. Frontend/middleware protection is never relied upon alone.

## 13. UI/UX Requirements

The site must feel like a real premium dry-cleaning business, not a coding tutorial:
clean, modern, minimal, professional, trustworthy, responsive.

* Responsive navbar with desktop navigation and a mobile navigation sheet.
* Loading states (route `loading.tsx` files + skeletons/spinners in buttons).
* Empty states for cart, services filter and order history.
* Form validation errors rendered inline next to the field and announced to assistive
  tech via `aria-invalid` / `role="alert"`.
* Success messages (order placed, added to cart, email status) and general error
  handling (`error.tsx`, friendly messages, never raw stack traces).
* Accessible controls: labelled inputs, keyboard-operable menu/select/sheet, visible
  focus rings, `sr-only` text for icon-only buttons, semantic landmarks.
* Meaningful image `alt` text (`next/image` where a real asset exists; CSS/SVG art
  otherwise since no photography assets are shipped).
* SEO: per-page `metadata` export, Open Graph + Twitter metadata, `metadataBase`,
  `sitemap.ts`, `robots.ts`, canonical URLs.
* Animations are minimal (hover transitions and entrance of sheets/menus only).

## 14. Security Rules

* Validate all user input server-side with Zod (client validation is UX only).
* Keep secrets server-side; never commit them.
* Never trust client-submitted prices, totals or line items.
* Enforce authorization server-side on every protected page/route/action.
* Customers can only ever read their own orders and cart (ownership in the query).
* Use the ORM/parameterised queries — no string-interpolated SQL.
* Do not expose internal errors to users; log details server-side only.
* Never render stack traces in production.
* Set `Referrer-Policy`/`X-Content-Type-Options`/`X-Frame-Options` style headers in
  `next.config.ts` and disable `x-powered-by`.
<!-- DOC-END -->