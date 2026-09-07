import { getAllProducts } from '@/lib/shopify/queries/products';
import { ProductCard } from '@/components/shop/ProductCard';
import { LocationCards } from '@/components/home/LocationCards';
import Link from 'next/link';
import Image from 'next/image';

export default async function HomePage() {
  const productsData = await getAllProducts(8);
  const featuredProducts = productsData.products?.edges?.slice(0, 4).map((edge: any) => edge.node) || [];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-7xl font-bold text-gray-900">
                  Your Curly Hair
                  <span className="block text-green-700">Guru</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-lg">
                  20 years of experience transforming curly hair with expertise, education, and premium products.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/booking"
                  className="px-8 py-4 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 transition-colors text-center"
                >
                  Book Appointment
                </Link>
                <Link 
                  href="/products"
                  className="px-8 py-4 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors text-center"
                >
                  Shop Products
                </Link>
              </div>

              <div className="flex items-center space-x-6 pt-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Vidal Sassoon Certified</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">4.9★ (500+ reviews)</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl bg-gray-200">
                <Image
                  src="/images/antonio-berducci.jpg"
                  alt="Antonio Berducci - Your Curly Hair Guru"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Locations Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Our Locations</h2>
          <LocationCards />
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold">Featured Products</h2>
            <Link href="/products" className="text-green-700 hover:underline">
              View All Products →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}