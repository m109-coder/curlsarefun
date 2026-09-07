import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Services - Curls Are Fun',
  description: 'Professional curly hair services.',
};

export default function ServicesPage() {
  const services = [
    {
      title: 'Cut & Curl',
      subtitle: 'Signature Curly Haircut',
      description: 'Our signature Cut & Curl service is designed specifically for curly hair.',
    },
    {
      title: 'Weddings',
      subtitle: 'Bridal Hair Services',
      description: 'Complete bridal hair services for your special day.',
    },
    {
      title: 'Color Correction',
      subtitle: 'Specialized Color Services',
      description: 'Expert color correction services for curly hair.',
    },
    {
      title: 'Consultation',
      subtitle: 'Expert Hair Analysis',
      description: 'A comprehensive consultation to analyze your hair type.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 overflow-x-hidden">
      <div className="text-center mb-10 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Services Offered</h1>
        <p className="text-lg text-gray-600">Specialized curly hair services by Antonio Berducci</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {services.map((service) => (
          <div key={service.title} className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col transition-shadow hover:shadow-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{service.title}</h2>
            <p className="text-green-600 font-medium mb-3">{service.subtitle}</p>
            <p className="text-gray-700 mb-6 flex-1">{service.description}</p>
            <Link
              href="/booking"
              className="inline-block w-full sm:w-auto text-center px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 min-h-[52px]"
            >
              Book {service.title}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
