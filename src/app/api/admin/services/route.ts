import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

/**
 * GET /api/admin/services?locationId=...
 *
 * Returns the list of services for a given salon location from the database.
 * Used by the admin services management view.
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

    const where = locationId ? { locationId } : {};

    const services = await prisma.service.findMany({
      where,
      orderBy: [{ locationId: 'asc' }, { executionOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error('[admin/services] GET failed:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

/**
 * POST /api/admin/services
 *
 * Creates a new service for a salon location.
 *
 * Body:
 *   - locationId: string
 *   - name: string
 *   - description?: string
 *   - duration: number (minutes)
 *   - price: number
 *   - depositAmount: number
 *   - category: string
 *   - executionOrder?: number
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      locationId,
      name,
      description = '',
      duration,
      price,
      depositAmount,
      category,
      executionOrder = 99,
    } = body;

    if (!locationId || !name || duration === undefined || price === undefined || depositAmount === undefined || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        locationId,
        name,
        description: description || name,
        duration: Number(duration),
        price: Number(price),
        depositAmount: Number(depositAmount),
        category,
        executionOrder: Number(executionOrder),
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error('[admin/services] POST failed:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}
