import { getAllProducts } from '@/lib/shopify/queries/products';
import { ProductCard } from '@/components/shop/ProductCard';
import { LocationCards } from '@/components/home/LocationCards';
import { WaveDivider } from '@/components/ui/WaveDivider';
import Link from 'next/link';
import Image from 'next/image';

/**
 * Storefront home page (server component).
 *
 * Fetches the first products from Shopify and renders the hero section,
 * salon location cards (with map modal), and a featured products grid.
 */
export default async function HomePage() {
  // Fetch up to 8 products, keep only the first 4 for the featured row
  const productsData = await getAllProducts(8);
  const featuredProducts = productsData.products?.edges?.slice(0, 4).map((edge: any) => edge.node) || [];

  return (
    <div className="flex flex-col">
      {/* Hero Section — full-screen image + warm dark overlay + wave into tertiary */}
      <section className="relative min-h-[100svh] flex items-center justify-center">
        <Image
          src="https://images.unsplash.com/photo-1747710016904-2b93d97ffb72?auto=format&fit=crop&w=1920&q=80"
          alt="Woman with beautiful voluminous curly hair"
          fill
          className="object-cover object-center animate-fade-in"
          priority
          sizes="100vw"
        />
        {/* Warm gradient overlay: keeps the headline 100% legible without hiding the photo */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-[#3C2F2F]/60" aria-hidden="true" />

        <div className="relative z-10 text-center px-4 sm:px-6 max-w-3xl mx-auto space-y-8 py-24 animate-fade-in">
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-white leading-tight">
            Your Curly Hair
            <span className="block text-tertiary">Guru</span>
          </h1>
          <p className="font-body text-lg sm:text-xl text-tertiary/90 max-w-xl mx-auto">
            20 years of experience transforming curly hair with expertise, education, and premium products.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/booking"
              className="px-10 py-4 bg-primary text-white rounded-full font-body font-semibold hover:bg-primary-dark transition-colors text-center shadow-lg"
            >
              Book Appointment
            </Link>
            <Link
              href="/products"
              className="px-10 py-4 bg-transparent border-2 border-tertiary text-tertiary rounded-full font-body font-semibold hover:bg-tertiary/10 transition-colors text-center"
            >
              Shop Products
            </Link>
          </div>

          <div className="flex items-center justify-center space-x-6 pt-2">
            <span className="text-sm text-tertiary/80 font-body">Vidal Sassoon Certified</span>
            <span className="text-sm text-tertiary/80 font-body">4.9★ (500+ reviews)</span>
          </div>
        </div>

        {/* Curl wave into the locations section */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <WaveDivider fill="#F9E4D4" />
        </div>
      </section>

      {/* Locations Section — no bottom padding so the wave sits flush at the edge */}
      <section className="bg-tertiary pt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl sm:text-4xl text-center text-neutral-dark mb-12">
            Our Locations
          </h2>
          <LocationCards />
        </div>
        <WaveDivider fill="#FFFFFF" className="mt-16" />
      </section>

      {/* Featured Products */}
      <section className="bg-white pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl text-neutral-dark">Featured Products</h2>
            <Link
              href="/products"
              className="font-body font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              View All Products →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
        <WaveDivider fill="#3C2F2F" className="mt-20" />
      </section>
    </div>
  )
}
