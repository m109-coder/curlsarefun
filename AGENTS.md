# CurlsAreFun - Project State

## Authentication

- Custom JWT authentication with `admin-token` HttpOnly cookie
- Login: `POST /api/admin/login`
- Verify: `GET /api/admin/verify`
- Logout: `POST /api/admin/logout`
- Middleware checks for cookie presence (JWT verification happens client-side)
- Edge Runtime crypto issue avoided by not verifying JWT in middleware

## Admin Credentials

- Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` (or `ADMIN_PASSWORD`) as environment variables in production
- No admin credentials should be committed to the repository

## Layout Structure (Route Groups)

- `src/app/layout.tsx` - Root layout with only html/body, no Header/Footer
- `src/app/(storefront)/layout.tsx` - Public store layout with Header, Footer, CartProvider, CartDrawer
- `src/app/admin/layout.tsx` - Admin dashboard layout with sidebar, isolated from public layout
- `src/app/admin/login/layout.tsx` - Minimal layout for login page

## Database

- PostgreSQL (Supabase or Neon recommended for Vercel)
- Prisma 5.22.0
- `DATABASE_URL` configured in environment variables (never committed)

## Shopify

- Storefront API configured
- Admin API connected (`src/lib/shopify/admin-client.ts`)
- `SHOPIFY_ADMIN_ACCESS_TOKEN` configured in environment variables
- Required scopes for order creation: `write_orders` and `write_draft_orders`

## Dashboard

- `GET /api/admin/dashboard` returns real data from Prisma and Shopify
- Dashboard page is client component fetching this endpoint
- Includes timeout for DB connection to prevent hangs

## Development

- `npm run dev` (defaults to port 3000, falls back if in use)
- `npm run build` to verify production build
- Clean `.next` cache if build issues: `Remove-Item -Recurse -Force .next`

## Pending Tasks

1. Configure production environment variables in Vercel/Netlify
2. Verify admin password in database (remove fallback)
3. Add more admin features (create booking, add client)
4. Migrate Supabase credentials to use service role key properly
5. Add checkout validation and webhook idempotency
