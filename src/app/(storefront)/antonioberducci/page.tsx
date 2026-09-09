import { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Antonio Berducci - Curls Are Fun',
  description: 'Meet Antonio Berducci, your curly hair guru. With 20 years of experience as both a stylist and educator in hair and makeup.',
};

/**
 * Static bio page for Antonio Berducci (extended version of /about).
 * Purely presentational.
 */
export default function AntonioPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Meet Antonio:</h1>
          <h2 className="text-2xl font-semibold text-green-700">THE CURLY HAIR GURU</h2>
        </div>

        {/* Antonio's Image */}
        <div className="mb-12">
          <div className="relative aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden mb-6">
            <Image
              src="/images/antonio-berducci.jpg"
              alt="Antonio Berducci - Your Curly Hair Guru"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </div>

        {/* Bio Section */}
        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <p>
            A native of Spain and Italy, Antonio has called many places home, including Brazil, Barcelona, Madrid, Milan, Los Angeles, and New York City. In addition, his frequent travels to visit diverse cultures and experience fashion all over the world continue to inform his style and expertise.
          </p>

          <p>
            Antonio is a graduate of the Vidal Sassoon Academy in Santa Monica, California, where he studied esthetics and cosmetology. He was a national makeup artist for Lancôme, and then worked with Sebastian International as a platform artist. With 20 years of experience – both as a stylist and educator in hair and make-up - Antonio brings a strong portfolio to the salon. He is a recognized specialist in curly hair.
          </p>

          <div className="bg-green-50 border-l-4 border-green-600 p-6 my-8">
            <p className="text-lg font-semibold text-green-900">
              "Your hair will be rejuvenated, reinvigorated and restored to its natural order."
            </p>
          </div>

          <p>
            Antonio and his team of stylists bring a wealth of experience, ideas and vast knowledge of the world of curls. We will teach you to understand, embrace and care for your curls, with the best service and attention that your curls deserve. Choose from our line of botanically-infused and moisture-rich products to fit any type of curls.
          </p>

          <blockquote className="border-l-4 border-green-600 pl-6 italic text-gray-600">
            <p className="text-lg">
              "My experience with curly hair has allowed me to surrender to an unconditional flow of information and feedback that happens naturally in my salon chair and in an educational forum. It humbles me to facilitate the unique beauty and different ways that hair responds to our method of cutting, and how our products enhance it each time."
            </p>
            <cite className="block mt-4 text-gray-500 not-italic">— Antonio Berducci, Your Curly Hair Guru</cite>
          </blockquote>
        </div>

        {/* Newsletter Section */}
        <div className="mt-12 bg-gray-50 rounded-lg p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Subscribe</h3>
          <p className="text-gray-600 mb-6">Sign up with your email address to receive news and updates.</p>
          <form className="flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              placeholder="Email Address"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Sign Up
            </button>
          </form>
          <p className="text-sm text-gray-500 mt-4">We respect your privacy.</p>
        </div>
      </div>
    </div>
  );
}