import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/prisma';
import { getLocationById } from '@/config/locations';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * GET /api/admin/appointments/{id}
 *
 * Returns a single appointment with client and services for the
 * admin edit/details view. Services are sorted by executionOrder.
 *
 * Requires a valid `admin-token` JWT cookie.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('admin-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: { client: true, services: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...appointment,
      services: appointment.services.slice().sort((a, b) => a.executionOrder - b.executionOrder),
    });
  } catch (error) {
    console.error('Failed to fetch appointment:', error);
    return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/appointments/{id}
 *
 * Updates an existing appointment. Resolves the final service list,
 * recalculates duration, price, deposit and balance due, and adjusts
 * the end time accordingly. Supports status, payment and notes edits.
 *
 * Body (all optional): date, startTime, status, serviceIds, guestCount,
 * notes, depositPaid, amountPaid, paymentOption.
 *
 * Requires a valid `admin-token` JWT cookie.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('admin-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const {
      date,
      startTime,
      status,
      serviceIds,
      guestCount,
      notes,
      depositPaid,
      amountPaid,
      paymentOption,
    } = body;

    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { client: true, services: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Apply fallbacks for omitted optional fields
    const finalGuestCount = typeof guestCount === 'number' && guestCount > 0 ? guestCount : existing.guestCount;
    const finalDate = date ? new Date(date) : existing.date;
    const finalStartTime = startTime || existing.startTime;
    const finalStatus = status || existing.status;
    const finalNotes = notes !== undefined ? notes : existing.notes;
    const finalDepositPaid = depositPaid !== undefined ? depositPaid : existing.depositPaid;
    const finalAmountPaid = amountPaid !== undefined ? amountPaid : existing.amountPaid;
    const finalPaymentOption = paymentOption !== undefined ? paymentOption : existing.paymentOption;

    // Resolve services and location
    const location = getLocationById(existing.locationId);
    const servicesToConnect = Array.isArray(serviceIds) ? serviceIds : existing.services.map((s) => s.id);
    const services = await prisma.service.findMany({
      where: { id: { in: servicesToConnect }, locationId: existing.locationId },
    });

    // Aggregate selected services and multiply by guest count
    const baseDuration = services.reduce((sum, s) => sum + s.duration, 0);
    const basePrice = services.reduce((sum, s) => sum + Number(s.price), 0);
    const baseDeposit = services.reduce((sum, s) => sum + Number(s.depositAmount), 0);
    const totalDuration = baseDuration * finalGuestCount;
    const totalAmount = basePrice * finalGuestCount;
    const totalDeposit = baseDeposit * finalGuestCount;

    // Calculate new end time
    const [hours, minutes] = finalStartTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + totalDuration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

    // Recalculate outstanding balance based on payment option and amount paid
    let balanceDue = Number(existing.balanceDue);
    if (finalStatus === 'CONFIRMED' && !finalPaymentOption) {
      balanceDue = 0;
    } else if (finalPaymentOption === 'deposit') {
      balanceDue = totalAmount - totalDeposit;
    } else if (finalPaymentOption === 'full') {
      balanceDue = 0;
    } else {
      balanceDue = totalAmount - Number(finalAmountPaid);
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        date: finalDate,
        startTime: finalStartTime,
        endTime,
        status: finalStatus,
        guestCount: finalGuestCount,
        totalAmount,
        balanceDue,
        depositPaid: finalDepositPaid,
        amountPaid: finalAmountPaid,
        paymentOption: finalPaymentOption,
        notes: finalNotes,
        timezone: location?.timezone || existing.timezone,
        services: {
          set: services.map((s) => ({ id: s.id })),
        },
      },
      include: { client: true, services: true },
    });

    return NextResponse.json({
      success: true,
      appointment: {
        ...updated,
        services: updated.services.slice().sort((a, b) => a.executionOrder - b.executionOrder),
      },
    });
  } catch (error) {
    console.error('Failed to update appointment:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
