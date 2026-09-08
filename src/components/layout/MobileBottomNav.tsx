'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, MapPin, CalendarCheck } from 'lucide-react';

/**
 * Mobile-only bottom navigation bar.
 *
 * Solid `tertiary` background so it never blends into the content behind it.
 * The center booking button is raised (floating pill) as in the approved
 * prototype.
 */
export function MobileBottomNav() {
  const pathname = usePathname();

  // Hide the bar inside conversion flows (booking wizard, checkout, success)
  // so it never covers the primary CTA buttons.
  if (pathname.startsWith('/booking') || pathname.startsWith('/checkout')) {
    return null;
  }

  const items = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/services', label: 'Services', icon: Sparkles },
    { href: '/locations', label: 'Locations', icon: MapPin },
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-tertiary border-t border-secondary/30 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2">
        {items.slice(0, 2).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center py-2.5 px-3 min-w-[64px] min-h-[52px] font-body text-xs font-medium transition-colors ${
              isActive(href) ? 'text-primary' : 'text-neutral-dark/70'
            }`}
          >
            <Icon className="w-5 h-5 mb-1" />
            {label}
          </Link>
        ))}

        {/* Floating booking CTA */}
        <Link
          href="/booking"
          className="relative -top-4 flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary-dark transition-colors"
          aria-label="Book appointment"
        >
          <CalendarCheck className="w-6 h-6" />
        </Link>

        {items.slice(2).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center py-2.5 px-3 min-w-[64px] min-h-[52px] font-body text-xs font-medium transition-colors ${
              isActive(href) ? 'text-primary' : 'text-neutral-dark/70'
            }`}
          >
            <Icon className="w-5 h-5 mb-1" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
