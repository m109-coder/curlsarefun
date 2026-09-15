import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get('admin-token')?.value;
  if (!token) return { error: 'Unauthorized', status: 401 };

  try {
    jwt.verify(token, JWT_SECRET);
    return null;
  } catch {
    return { error: 'Invalid token', status: 401 };
  }
}

/**
 * PUT /api/admin/services/[id]
 *
 * Updates an existing service.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = verifyAdmin(request);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const { id } = params;
    const body = await request.json();
    const {
      locationId,
      name,
      description,
      duration,
      price,
      depositAmount,
      category,
      executionOrder,
    } = body;

    if (!locationId || !name || duration === undefined || price === undefined || depositAmount === undefined || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        locationId,
        name,
        description: description || name,
        duration: Number(duration),
        price: Number(price),
        depositAmount: Number(depositAmount),
        category,
        executionOrder: Number(executionOrder ?? 99),
      },
    });

    return NextResponse.json({ service });
  } catch (error) {
    console.error('[admin/services/[id]] PUT failed:', error);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/services/[id]
 *
 * Deletes a service.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = verifyAdmin(request);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const { id } = params;

    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/services/[id]] DELETE failed:', error);
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 });
  }
}
