import { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'About Antonio - Curls Are Fun',
  description: 'Meet Antonio Berducci, your curly hair guru.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Meet Antonio:</h1>
          <h2 className="text-2xl font-semibold text-green-700">THE CURLY HAIR GURU</h2>
        </div>

        <div className="mb-12">
          <div className="relative aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden mb-6">
            <Image
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop"
              alt="Antonio Berducci"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </div>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <p>
            A native of Spain and Italy, Antonio has called many places home, including Brazil, Barcelona, Madrid, Milan, Los Angeles, and New York City.
          </p>

          <p>
            Antonio is a graduate of the Vidal Sassoon Academy in Santa Monica, California. He was a national makeup artist for Lancôme, and then worked with Sebastian International as a platform artist. With 20 years of experience as a stylist and educator, Antonio brings a strong portfolio to the salon.
          </p>

          <div className="bg-green-50 border-l-4 border-green-600 p-6 my-8">
            <p className="text-lg font-semibold text-green-900">
              "Your hair will be rejuvenated, reinvigorated and restored to its natural order."
            </p>
          </div>

          <p>
            Antonio and his team of stylists bring a wealth of experience and knowledge of the world of curls.
          </p>
        </div>

        <div className="mt-12 bg-gray-50 rounded-lg p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Subscribe</h3>
          <p className="text-gray-600 mb-6">Sign up with your email address to receive news and updates.</p>
          <form className="flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              placeholder="Email Address"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold"
            >
              Sign Up
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}