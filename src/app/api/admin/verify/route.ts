import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

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
