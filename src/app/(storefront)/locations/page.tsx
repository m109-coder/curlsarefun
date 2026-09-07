import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Locations - Curls Are Fun',
  description: 'Find Curls Are Fun salons in New York, Boston, and Los Angeles.',
};

export default function LocationsPage() {
  const locations = [
    {
      city: 'New York, NY',
      salon: 'CURLS ARE FUN',
      address: ['269 W 39th Street, 7th Floor', 'New York, NY 10018'],
      phone: '917-932-4459',
      theme: 'green',
    },
    {
      city: 'Boston, MA',
      salon: 'PHATOS SALON',
      address: ['270 Newbury Street', 'Boston, MA 02116'],
      phone: '917-932-4459',
      theme: 'blue',
    },
    {
      city: 'Los Angeles, CA',
      salon: 'STUDIO 210',
      address: ['11677 San Vicente Blvd #210', 'Los Angeles, CA 90049'],
      phone: '310-714-1732',
      theme: 'purple',
    },
  ];

  const themeClasses: Record<string, { title: string; button: string; outline: string }> = {
    green: { title: 'text-green-700', button: 'bg-green-600 hover:bg-green-700', outline: 'border-green-600 text-green-600 hover:bg-green-50' },
    blue: { title: 'text-blue-700', button: 'bg-blue-600 hover:bg-blue-700', outline: 'border-blue-600 text-blue-600 hover:bg-blue-50' },
    purple: { title: 'text-purple-700', button: 'bg-purple-600 hover:bg-purple-700', outline: 'border-purple-600 text-purple-600 hover:bg-purple-50' },
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 overflow-x-hidden">
      <div className="text-center mb-10 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Our Locations</h1>
        <p className="text-lg text-gray-600">Professional curly hair services across the country</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {locations.map((loc) => {
          const theme = themeClasses[loc.theme];
          return (
            <div key={loc.city} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col transition-shadow hover:shadow-md">
              <h2 className={`text-2xl font-bold ${theme.title} mb-1`}>{loc.city}</h2>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{loc.salon}</h3>

              <div className="space-y-1 mb-6 text-gray-700">
                {loc.address.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                <p>Phone: <a href={`tel:${loc.phone.replace(/-/g, '')}`} className="text-green-600 hover:underline">{loc.phone}</a></p>
              </div>

              <div className="space-y-3 mt-auto">
                <Link
                  href="/booking"
                  className={`block w-full px-4 py-3.5 text-white rounded-xl text-center font-semibold transition-all duration-200 min-h-[52px] ${theme.button}`}
                >
                  Book {loc.city.split(',')[0]}
                </Link>
                <Link
                  href="/services"
                  className={`block w-full px-4 py-3.5 border rounded-xl text-center font-semibold transition-all duration-200 min-h-[52px] ${theme.outline}`}
                >
                  View Services
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 sm:mt-16 bg-green-50 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Book Your Appointment?</h2>
        <Link
          href="/booking"
          className="inline-block px-8 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 min-h-[56px]"
        >
          Book Now
        </Link>
      </div>
    </div>
  );
}
