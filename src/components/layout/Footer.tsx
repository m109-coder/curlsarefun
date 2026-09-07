import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-neutral-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <h3 className="text-2xl font-display mb-4">CURLS ARE FUN</h3>
            <p className="text-gray-400 text-sm">
              Your Curly Hair Guru with 20 years of experience transforming curly hair.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/about" className="hover:text-white transition-colors">About Antonio</Link></li>
              <li><Link href="/services" className="hover:text-white transition-colors">Services</Link></li>
              <li><Link href="/products" className="hover:text-white transition-colors">Shop Products</Link></li>
              <li><Link href="/booking" className="hover:text-white transition-colors">Book Appointment</Link></li>
            </ul>
          </div>

          {/* Locations */}
          <div>
            <h4 className="font-semibold mb-4">Locations</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/locations/new-york" className="hover:text-white transition-colors">New York</Link></li>
              <li><Link href="/locations/boston" className="hover:text-white transition-colors">Boston</Link></li>
              <li><Link href="/locations/los-angeles" className="hover:text-white transition-colors">Los Angeles</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="mailto:info@antonioberducci.com" className="hover:text-white transition-colors">info@antonioberducci.com</a></li>
              <li><a href="tel:917-932-4459" className="hover:text-white transition-colors">917-932-4459</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Curls Are Fun. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}