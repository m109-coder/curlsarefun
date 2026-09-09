import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/logout
 *
 * Clears the `admin-token` cookie and ends the admin session.
 * Safe to call even if the cookie is already missing.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  
  response.cookies.delete({ name: 'admin-token', path: '/' });
  
  return response;
}