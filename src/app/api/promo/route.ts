import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/promo
 *
 * Public read-only endpoint consumed by the storefront `PromoModal`. Returns
 * the most recently updated popup config. The modal only renders when
 * `isActive === true` and an `imageUrl` exists.
 */
export async function GET() {
  try {
    const promo = await prisma.promoPopup.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { isActive: true, imageUrl: true, targetUrl: true },
    });

    return NextResponse.json({ promo: promo ?? { isActive: false, imageUrl: null, targetUrl: null } });
  } catch (error) {
    console.error('[promo] fetch failed:', error);
    // Fail closed: on any error the storefront simply shows no popup.
    return NextResponse.json({ promo: { isActive: false, imageUrl: null, targetUrl: null } });
  }
}
