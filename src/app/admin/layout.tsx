'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  ShoppingBag,
  LogOut,
  Menu,
  X,
  Users,
  Megaphone
} from 'lucide-react';
import AuthProtection from '@/components/admin/AuthProtection';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Calendar', href: '/admin/calendar', icon: CalendarDays },
    { name: 'Bookings', href: '/admin/bookings', icon: Calendar },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
    { name: 'Marketing', href: '/admin/marketing', icon: Megaphone },
  ];

  const handleSignOut = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchSession = async () => {
    try {
      const response = await fetch('/api/admin/verify');
      const data = await response.json();
      if (data.authenticated) {
        setSession(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  // Don't wrap login page with AdminProtection
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <AuthProtection>
      <div className="flex h-screen w-full bg-gray-100 overflow-x-hidden">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-gray-900/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 flex-shrink-0 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="font-bold text-gray-900">Curls Admin</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close sidebar"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[48px]
                      ${isActive
                        ? 'bg-green-50 text-green-700 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User info */}
            <div className="border-t border-gray-100 px-5 py-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session?.name || 'Admin'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {session?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center space-x-2 text-sm text-gray-600 hover:text-red-600 w-full px-4 py-3 rounded-xl hover:bg-red-50 transition-colors min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-100 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-600">Admin Dashboard</span>
            </div>
            <div className="w-10" />
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthProtection>
  );
}
