import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  console.log('=== MIDDLEWARE ===');
  console.log('Pathname:', pathname);
  
  // Public routes - no authentication required
  const publicRoutes = ['/admin/login', '/api/admin/login', '/api/admin/logout', '/api/admin/verify']
  
  // Skip middleware for public routes
  if (publicRoutes.includes(pathname)) {
    console.log('Public route, skipping auth check');
    // If user is already logged in and tries to access login page, redirect to admin
    if (pathname === '/admin/login') {
      const token = request.cookies.get('admin-token')?.value
      console.log('Token in cookie:', token ? 'EXISTS' : 'NOT FOUND');
      if (token) {
        console.log('Token exists, redirecting to /admin');
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
    return NextResponse.next()
  }

  // Protect admin routes (excluding public routes)
  if (pathname.startsWith('/api/admin')) {
    const token = request.cookies.get('admin-token')?.value
    console.log('Protected API route, checking token:', token ? 'EXISTS' : 'NOT FOUND');

    if (!token) {
      console.log('No token, returning 401 for API route');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Token exists, allowing access');
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('admin-token')?.value
    console.log('Protected route, checking token:', token ? 'EXISTS' : 'NOT FOUND');

    if (!token) {
      console.log('No token, redirecting to /admin/login');
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    console.log('Token exists, allowing access (JWT verification will happen on client)');
  }

  console.log('Allowing access');
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
}