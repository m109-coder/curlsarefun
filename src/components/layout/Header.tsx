'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, Menu, X, Scissors } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { cartCount, setIsOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/about', label: 'About' },
    { href: '/services', label: 'Services' },
    { href: '/products', label: 'Shop' },
    { href: '/locations', label: 'Locations' },
    { href: '/contact', label: 'Contact' },
  ];

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 min-h-[44px]">
            <Scissors className="w-6 h-6 text-green-700" />
            <span className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">CURLS ARE FUN</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 hover:text-green-700 transition-colors duration-200 text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTAs */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              href="/booking"
              className="hidden md:inline-flex px-5 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 transition-all duration-200 min-h-[44px] items-center"
            >
              Book Appointment
            </Link>
            <button
              onClick={() => setIsOpen(true)}
              className="relative flex items-center justify-center w-11 h-11 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              className="md:hidden flex items-center justify-center w-11 h-11 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - exact structure: full screen, solid white, no transparency */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 w-full min-h-screen bg-white z-[100] flex flex-col pt-20 px-6 md:hidden">
          {/* Close button - top right with very high z-index */}
          <button
            onClick={closeMenu}
            className="fixed top-4 right-4 z-[110] flex items-center justify-center w-12 h-12 rounded-full hover:bg-gray-100 transition-colors bg-white shadow-sm border border-gray-100"
            aria-label="Close menu"
          >
            <X className="w-7 h-7 text-gray-900" />
          </button>

          {/* Navigation links */}
          <nav className="flex flex-col space-y-6 text-xl font-medium text-gray-900 mt-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="block w-full py-2 text-gray-900 hover:text-green-700 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Single primary CTA at the end of the list */}
          <div className="mt-auto pb-10 pt-6">
            <Link
              href="/booking"
              onClick={closeMenu}
              className="block w-full py-4 bg-green-600 text-white rounded-xl text-center text-lg font-semibold hover:bg-green-700 transition-all duration-200 min-h-[56px]"
            >
              Book Appointment
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
