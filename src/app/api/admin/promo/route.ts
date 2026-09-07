import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/promo  — returns the current popup config (or null).
 * PUT /api/admin/promo  — upserts the single popup config row.
 *
 * Auth: `/api/admin/*` is already guarded by `middleware.ts` (admin-token
 * cookie), so this handler only needs the business logic.
 */
export async function GET() {
  try {
    const promo = await prisma.promoPopup.findFirst({ orderBy: { updatedAt: 'desc' } });
    return NextResponse.json({ promo });
  } catch (error) {
    console.error('[admin/promo] fetch failed:', error);
    return NextResponse.json({ error: 'Failed to fetch promo settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { isActive, imageUrl, targetUrl } = body;

    const existing = await prisma.promoPopup.findFirst({ orderBy: { updatedAt: 'desc' } });

    const data = {
      isActive: Boolean(isActive),
      imageUrl: imageUrl ?? existing?.imageUrl ?? '',
      targetUrl: targetUrl ?? null,
    };

    if (!data.imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    const promo = existing
      ? await prisma.promoPopup.update({ where: { id: existing.id }, data })
      : await prisma.promoPopup.create({ data });

    return NextResponse.json({ promo });
  } catch (error) {
    console.error('[admin/promo] update failed:', error);
    return NextResponse.json({ error: 'Failed to update promo settings' }, { status: 500 });
  }
}
