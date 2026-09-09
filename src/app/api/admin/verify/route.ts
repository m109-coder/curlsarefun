import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

// This route reads cookies — it must never be statically prerendered.
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/verify
 *
 * Validates the `admin-token` JWT cookie and returns the decoded
 * admin identity. Returns `authenticated: false` when the cookie
 * is missing, expired or invalid.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, reason: 'no-cookie' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return NextResponse.json({ 
        authenticated: true, 
        user: {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role
        }
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'jwt-error';
      console.error('[verify] jwt.verify failed:', reason);
      return NextResponse.json({ authenticated: false, reason });
    }
  } catch (error) {
    const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error('[verify] outer handler error:', msg);
    return NextResponse.json({ authenticated: false, reason: 'handler-error', debug: msg });
  }
}
