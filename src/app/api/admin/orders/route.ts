import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getShopifyOrders, getShopifyOrderById } from '@/lib/shopify/admin-client';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

/**
 * GET /api/admin/orders?id=...
 *
 * Returns Shopify orders for the admin panel. If an `id` query param
 * is provided, fetches a single order; otherwise lists the last 50.
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
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Fetch one order by id or the most recent 50
    if (id) {
      const order = await getShopifyOrderById(id);
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      return NextResponse.json({ order });
    }

    const orders = await getShopifyOrders(50);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch orders';
    // Surface Shopify PII/permission errors with a clear client code
    if (message.includes('customer') || message.includes('Customer') || message.includes('permission') || message.includes('Permission') || message.includes('access denied')) {
      return NextResponse.json(
        { error: 'Permisos de cliente requeridos en Shopify', code: 'PII_REQUIRED', details: message },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: message },
      { status: 500 }
    );
  }
}
