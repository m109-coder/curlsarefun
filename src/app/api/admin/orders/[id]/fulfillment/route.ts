import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    return NextResponse.json(
      { error: 'Fulfillment mutation is not yet implemented in this version. Please use the Shopify admin panel.' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Fulfillment action error:', error);
    return NextResponse.json(
      { error: 'Failed to process fulfillment action' },
      { status: 500 }
    );
  }
}
