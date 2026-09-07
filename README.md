# Curls Are Fun — Salon Booking & E-Commerce Platform

Unified platform for **Curls Are Fun**: headless Shopify storefront + multi-location appointment booking (New York, Boston, Los Angeles) with combined Stripe checkout — customers can buy products and reserve a salon appointment in a single payment.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3.4, `framer-motion`, `lucide-react` |
| Database | PostgreSQL (Supabase/Neon) + Prisma 5 |
| E-commerce | Shopify Storefront API (products) + Admin REST API (orders) |
| Payments | Stripe Payment Intents + Webhooks |
| Auth (admin) | Custom JWT in `admin-token` HttpOnly cookie |
| Calendar | `react-big-calendar`, `date-fns`, `luxon` |
| Validation | `zod` + `react-hook-form` |

## Prerequisites

- Node.js 18+
- A PostgreSQL database (Supabase or Neon recommended)
- Shopify store with a **Storefront** access token and an **Admin API** access token (scopes: `read_products`, `read_orders`, `write_orders`, `write_draft_orders`)
- Stripe account (use **test keys** for staging)

## Installation

```bash
git clone <repo-url>
cd curlsarefun
npm install          # postinstall runs `prisma generate` automatically
cp .env.example .env # fill in real credentials (see .env.example)
npx prisma db push   # creates the schema on your database
npx tsx prisma/seed.ts  # optional: seeds services per location
npm run dev          # http://localhost:3000
```

Useful scripts:

```bash
npm run build        # production build (must pass before deploy)
npm run type-check   # tsc --noEmit
npm run lint         # next lint
npm run db:studio    # Prisma Studio
```

## Architecture

```
src/
├── app/
│   ├── (storefront)/        # Public site: home, products, booking, checkout
│   │   ├── booking/         # 4-step booking wizard
│   │   ├── booking/success/ # Confirmation + .ics / Google Calendar export
│   │   └── checkout/        # Unified Stripe checkout
│   ├── admin/               # Admin dashboard (orders, bookings, calendar)
│   └── api/
│       ├── availability/          # GET — free time slots per location/day
│       ├── appointments/          # POST — creates PENDING_PAYMENT hold
│       ├── create-payment-intent/ # POST — Stripe PI (product | booking | combined)
│       └── webhooks/stripe/       # POST — payment_intent.succeeded, etc.
├── components/   # booking wizard, cart drawer, admin UI
├── context/      # CartContext (cart + booking persisted in localStorage)
├── lib/
│   ├── booking/timezone.ts  # shift logic, slot generation, timezone utils
│   ├── shopify/             # Storefront client + Admin client (orders/drafts)
│   ├── stripe/client.ts     # Stripe singleton + compact metadata helpers
│   └── db/prisma.ts         # Prisma singleton
└── config/locations.ts      # NY / Boston / LA addresses + timezones
```

## API & Integration Flow

### Availability — `GET /api/availability`
1. `generateTimeSlots(date, locationId, serviceDuration)` produces candidate `"HH:mm"` start times (salon-local) where the **service** fits inside a shift. The 15-minute cleaning buffer is intentionally *not* included in the shift-fit check.
2. `CONFIRMED` and non-expired `PENDING_PAYMENT` appointments become busy intervals `[start, end + 15min)`.
3. A slot is free only if `[slotStart, slotStart + duration + 15min)` does not overlap a busy interval. Expired `PENDING_PAYMENT` holds are purged lazily.
4. Boston has a special rule (`isBostonOpenDate`): only the first/last Monday and Sunday of each month.

### Booking hold — `POST /api/appointments`
Creates a `PENDING_PAYMENT` appointment with `expiresAt` (~30 min). Multi-service durations are **summed and multiplied by `guestCount`**; the 15-min buffer is applied once at the end of the block. Overlap conflicts return `409`.

### Payment — `POST /api/create-payment-intent`
- `type: "booking" | "product" | "combined"`.
- For booking/combined the server recomputes the price from the DB — the client `amount` is only trusted for product-only payments.
- `metadata.items` is compacted to `{"v","q","p"}` to stay under Stripe's 500-char metadata limit.
- `setup_future_usage: 'off_session'` is only set when a Stripe customer exists (for booking/combined).

### Fulfillment — `POST /api/webhooks/stripe`
- Signature verified with `STRIPE_WEBHOOK_SECRET` via `constructEvent` on the raw body.
- `payment_intent.succeeded`: marks the appointment `CONFIRMED`, then creates a **real Shopify order** (`POST /orders.json`). Product lines send `{ variant_id, quantity }` only (no prices — Shopify resolves them); service lines send `{ title, price, quantity }` with appointment metadata in `properties`. If order creation is rejected (e.g. `partially_paid` without transactions, or mixed line types), it falls back to a **Draft Order** so the sale is never lost.
- `payment_intent.payment_failed`: cancels the hold, releasing the slot.
- `charge.refunded`: marks the appointment `CANCELLED`.
- The webhook always returns `200` after logging errors — Stripe retries on non-2xx, and re-throwing after a captured payment could duplicate orders.

## Environment Variables

See `.env.example`. Highlights:

- `DATABASE_URL` — PostgreSQL connection string.
- `SHOPIFY_ADMIN_ACCESS_TOKEN` — needs `read/write orders`, `read/write draft_orders`, `read_products`.
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — test keys in staging.
- `STRIPE_WEBHOOK_SECRET` — obtained when creating the Stripe webhook pointing to `https://<domain>/api/webhooks/stripe`.
- `JWT_SECRET` — 32+ char random string for admin sessions.
- `NEXT_PUBLIC_APP_URL` — the deployed domain.

## Deployment (Vercel)

1. Push to GitHub, import the repo in Vercel (framework auto-detected via `vercel.json`).
2. Add all environment variables in Project Settings.
3. `postinstall` runs `prisma generate`; run `npx prisma db push` against the production `DATABASE_URL` once.
4. Create the Stripe webhook endpoint and paste its secret into `STRIPE_WEBHOOK_SECRET`.
5. Update `NEXT_PUBLIC_APP_URL` to the production domain.

## License

Proprietary and confidential.
