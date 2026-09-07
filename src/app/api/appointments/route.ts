import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getLocationById } from '@/config/locations';
import { DateTime } from 'luxon';

function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

const BUFFER_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      locationId,
      serviceIds,
      guestCount,
      clientInfo,
      selectedDate,
      selectedTime,
      notes,
    } = body;

    // Validate required fields
    if (!locationId || !Array.isArray(serviceIds) || serviceIds.length === 0 || !clientInfo || !selectedDate || !selectedTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const guests = typeof guestCount === 'number' && guestCount > 0 ? guestCount : 1;

    // Sanitize client info
    const sanitizedClientInfo = {
      name: sanitizeInput(clientInfo.name),
      email: sanitizeInput(clientInfo.email),
      phone: clientInfo.phone ? sanitizeInput(clientInfo.phone) : '',
    };

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedClientInfo.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get location and services details
    const location = getLocationById(locationId);
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        locationId,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Invalid location' },
        { status: 400 }
      );
    }

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: 'One or more invalid services for this location' },
        { status: 400 }
      );
    }

    const baseDuration = services.reduce((sum, s) => sum + s.duration, 0);
    const basePrice = services.reduce((sum, s) => sum + Number(s.price), 0);
    const baseDeposit = services.reduce((sum, s) => sum + Number(s.depositAmount), 0);
    const totalDuration = baseDuration * guests;
    const totalAmount = basePrice * guests;
    const totalDeposit = baseDeposit * guests;

    // Create client first
    const client = await prisma.client.upsert({
      where: { email: sanitizedClientInfo.email },
      update: {},
      create: {
        name: sanitizedClientInfo.name,
        email: sanitizedClientInfo.email,
        phone: sanitizedClientInfo.phone,
      },
    });

    // Calculate end time based on total duration (guests * total base duration)
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + totalDuration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

    // Strict conflict check for public bookings (buffer included)
    const salonDate = DateTime.fromISO(selectedDate, { zone: location.timezone });
    const startOfDay = salonDate.startOf('day').toJSDate();
    const endOfDay = salonDate.plus({ days: 1 }).startOf('day').toJSDate();

    const newStart = timeToMinutes(selectedTime);
    const newEnd = timeToMinutes(endTime) + BUFFER_MINUTES;

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        locationId,
        date: { gte: startOfDay, lt: endOfDay },
        OR: [
          { status: 'CONFIRMED' },
          { status: 'PENDING_PAYMENT', expiresAt: { gt: new Date() } },
        ],
      },
      select: { startTime: true, endTime: true },
    });

    const hasConflict = existingAppointments.some((apt) => {
      const existingStart = timeToMinutes(apt.startTime);
      const existingEnd = timeToMinutes(apt.endTime) + BUFFER_MINUTES;
      return newStart < existingEnd && newEnd > existingStart;
    });

    if (hasConflict) {
      return NextResponse.json(
        { error: 'Selected time slot is no longer available. Please choose another time.' },
        { status: 409 }
      );
    }

    // Create appointment with pending payment status and 15-minute hold
    const holdDurationMinutes = 15;
    const expiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);

    const newAppointment = await prisma.appointment.create({
      data: {
        locationId,
        services: {
          connect: serviceIds.map((id: string) => ({ id })),
        },
        clientId: client.id,
        date: new Date(selectedDate),
        startTime: selectedTime,
        endTime,
        timezone: location.timezone,
        status: 'PENDING_PAYMENT',
        depositPaid: false,
        guestCount: guests,
        totalAmount,
        balanceDue: totalAmount - totalDeposit,
        notes: notes ? sanitizeInput(notes) : '',
        expiresAt,
      },
      include: {
        client: true,
        services: true,
      },
    });

    return NextResponse.json({
      success: true,
      appointment: {
        ...newAppointment,
        depositAmount: totalDeposit,
      },
      services,
      location,
    });

  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to create appointment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
