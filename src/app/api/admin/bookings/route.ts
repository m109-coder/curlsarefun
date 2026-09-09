import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/prisma';
import { getLocationById } from '@/config/locations';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * POST /api/admin/bookings
 *
 * Creates an appointment from the admin panel, bypassing public
 * availability checks. Upserts the client, recalculates totals for
 * the guest count and creates the appointment in the requested status.
 *
 * Body: locationId, serviceIds, guestCount, clientInfo,
 * selectedDate, selectedTime, notes, status (default CONFIRMED).
 *
 * Requires a valid `admin-token` JWT cookie.
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
      serviceIds,
      guestCount,
      clientInfo,
      selectedDate,
      selectedTime,
      notes,
      status = 'CONFIRMED',
    } = body;

    if (!locationId || !Array.isArray(serviceIds) || serviceIds.length === 0 || !clientInfo || !selectedDate || !selectedTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const guests = typeof guestCount === 'number' && guestCount > 0 ? guestCount : 1;

    const sanitizedClientInfo = {
      name: sanitizeInput(clientInfo.name),
      email: sanitizeInput(clientInfo.email),
      phone: clientInfo.phone ? sanitizeInput(clientInfo.phone) : '',
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedClientInfo.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

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

    // Aggregate selected services and multiply by guest count
    const baseDuration = services.reduce((sum, s) => sum + s.duration, 0);
    const basePrice = services.reduce((sum, s) => sum + Number(s.price), 0);
    const totalDuration = baseDuration * guests;
    const totalAmount = basePrice * guests;

    // Create or get client
    const client = await prisma.client.upsert({
      where: { email: sanitizedClientInfo.email },
      update: {},
      create: {
        name: sanitizedClientInfo.name,
        email: sanitizedClientInfo.email,
        phone: sanitizedClientInfo.phone,
      },
    });

    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + totalDuration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

    // Admin override: bypass availability/conflict checks
    const appointment = await prisma.appointment.create({
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
        status,
        depositPaid: false,
        guestCount: guests,
        totalAmount,
        balanceDue: totalAmount,
        notes: notes ? sanitizeInput(notes) : '',
      },
      include: {
        client: true,
        services: true,
      },
    });

    return NextResponse.json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.error('Error creating admin booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
