import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateTimeSlots, getLocationShiftsForDate } from '@/lib/booking/timezone';
import { getLocationTimezone } from '@/config/locations';
import { DateTime } from 'luxon';

export const dynamic = 'force-dynamic';

const BUFFER_MINUTES = 15;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function normalizeDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const dateParam = searchParams.get('date');
    const serviceDurationParam = searchParams.get('serviceDuration');

    if (!locationId || !dateParam || !serviceDurationParam) {
      return NextResponse.json(
        { error: 'Missing locationId, date, or serviceDuration' },
        { status: 400 }
      );
    }

    const serviceDuration = Number(serviceDurationParam);
    if (!Number.isFinite(serviceDuration) || serviceDuration <= 0) {
      return NextResponse.json(
        { error: 'Invalid serviceDuration' },
        { status: 400 }
      );
    }

    // Clean expired holds before checking availability
    const now = new Date();
    await prisma.appointment.updateMany({
      where: {
        status: 'PENDING_PAYMENT',
        expiresAt: { lt: now },
      },
      data: {
        status: 'CANCELLED',
      },
    });

    // Parse the requested date (should already be in ISO, but normalize to midnight UTC for DB query)
    const requestedDate = new Date(dateParam);
    const startOfDay = normalizeDate(requestedDate);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Find existing appointments (confirmed or non-expired pending holds)
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        locationId,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
        OR: [
          { status: 'CONFIRMED' },
          { status: 'PENDING_PAYMENT', expiresAt: { gt: now } },
        ],
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // Convert to salon timezone for shift logic
    const salonDate = DateTime.fromJSDate(requestedDate, { zone: getLocationTimezone(locationId) });
    const shifts = getLocationShiftsForDate(locationId, salonDate);

    if (shifts.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // Generate all possible time slots for the day
    const allSlots = generateTimeSlots(requestedDate, locationId, serviceDuration);

    // Build busy intervals: [busyStart, busyEnd+buffer]
    const busyIntervals = existingAppointments.map((apt) => {
      const start = timeToMinutes(apt.startTime);
      const end = timeToMinutes(apt.endTime) + BUFFER_MINUTES;
      return { start, end };
    });

    // Filter out slots that overlap with any busy interval
    const freeSlots = allSlots.filter((slot) => {
      const slotStart = timeToMinutes(slot);
      const slotEnd = slotStart + serviceDuration + BUFFER_MINUTES;

      return !busyIntervals.some(
        (busy) => slotStart < busy.end && slotEnd > busy.start
      );
    });

    return NextResponse.json({ slots: freeSlots });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
