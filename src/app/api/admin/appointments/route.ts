import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/prisma';
import { DateTime } from 'luxon';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

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
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const where: any = {};

    if (locationId && locationId !== 'all') {
      where.locationId = locationId;
    }

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      where.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: true,
        services: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    const sortedAppointments = appointments.map((apt) => ({
      ...apt,
      services: apt.services.slice().sort((a, b) => a.executionOrder - b.executionOrder),
    }));

    return NextResponse.json(sortedAppointments);
  } catch (error) {
    console.error('Failed to fetch appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}
