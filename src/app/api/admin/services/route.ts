import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getLocationById } from '@/config/locations';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

/**
 * GET /api/admin/services?locationId=...
 *
 * Returns the list of services for a given salon location.
 * Used by the admin booking form and service management views.
 *
 * Requires a valid `admin-token` JWT cookie.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json({ error: 'Missing locationId' }, { status: 400 });
    }

    const location = getLocationById(locationId);

    if (!location) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 404 });
    }

    return NextResponse.json(location.services);
  } catch (error) {
    console.error('Failed to fetch services:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}
