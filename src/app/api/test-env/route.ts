import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const envCheck = {
    DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Set' : 'Not set',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Not set',
    SHOPIFY_ADMIN_ACCESS_TOKEN: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ? 'Set' : 'Not set',
    JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'Not set',
    NODE_ENV: process.env.NODE_ENV,
  };

  // Sanitized host so we can verify which DB endpoint Vercel is using
  const dbUrl = process.env.DATABASE_URL || '';
  const dbHost = dbUrl.match(/@([^:/]+)/)?.[1] || 'unknown';

  let dbStatus: { ok: boolean; appointments?: number; services?: number; error?: string } = { ok: false };
  try {
    const [appointments, services] = await Promise.all([
      prisma.appointment.count(),
      prisma.service.count(),
    ]);
    dbStatus = { ok: true, appointments, services };
  } catch (error) {
    dbStatus = {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown DB error',
    };
  }

  return NextResponse.json({ env: envCheck, dbHost, db: dbStatus });
}
