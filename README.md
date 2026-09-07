# Curls Are Fun - Modern Hair Salon Platform

A modern, unified platform for Curls Are Fun salon, integrating e-commerce and booking systems with a mobile-first approach.

## 🚀 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL with Prisma ORM
- **E-commerce:** Shopify Storefront API (Headless)
- **Payments:** Stripe
- **Timezone:** Luxon
- **Validation:** Zod + React Hook Form
- **Language:** TypeScript

## 📋 Features

### 🛒 E-commerce
- Headless Shopify integration
- Local cart with persistence
- Product pages with SSR
- Quick add functionality
- Mobile-optimized product cards

### 🗓️ Booking System
- Multi-location support (NY, Boston, LA)
- Timezone-aware calendar
- Service selection with pricing
- Deposit payment flow
- Email notifications

### 💳 Unified Payments
- Stripe integration for all payment types
- Support for products, services, and combined checkouts
- Mobile payments (Apple Pay, Google Pay)
- Webhook handling for order processing

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Shopify account with Storefront API access
- Stripe account

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
- Shopify Storefront API credentials
- Stripe API keys
- Database connection string

3. Set up the database:
```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/              # Next.js App Router
├── components/       # React components
├── context/          # React Context providers
├── lib/             # Business logic and API clients
├── hooks/           # Custom React hooks
├── types/           # TypeScript type definitions
└── config/          # Static configuration
```

## 🔧 Configuration

### Shopify Integration
Configure your Shopify Storefront API credentials in `.env.local`:
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN`

### Stripe Integration
Configure your Stripe API keys in `.env.local`:
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Database
Configure your PostgreSQL connection in `.env.local`:
- `DATABASE_URL`

## 🚢 Deployment

This project is designed to be deployed on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables
4. Deploy

## 📊 Monitoring

The project includes analytics tracking for:
- Page views
- Booking completions
- Purchase events
- User interactions

## 🧪 Testing

Run type checking:
```bash
npm run type-check
```

Run linting:
```bash
npm run lint
```

## 📝 License

This project is proprietary and confidential.

## 🤝 Support

For support, contact the development team.