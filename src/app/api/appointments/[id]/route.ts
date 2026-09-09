import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/appointments/{id}
 *
 * Retrieves a public-safe view of an appointment for the checkout page.
 * Returns only the deposit, balance and basic client information needed
 * to render the payment UI. Services are sorted by executionOrder.
 *
 * @returns Appointment details with payment and balance fields.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        services: true,
        client: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const guests = appointment.guestCount || 1;
    // Compute total deposit from all services multiplied by guest count
    const baseDeposit = appointment.services.reduce((sum, s) => sum + Number(s.depositAmount), 0);
    const totalDeposit = baseDeposit * guests;
    const totalPrice = Number(appointment.totalAmount);

    // Return limited public information for checkout
    return NextResponse.json({
      id: appointment.id,
      status: appointment.status,
      depositPaid: appointment.depositPaid,
      guestCount: guests,
      totalAmount: totalPrice,
      depositAmount: totalDeposit,
      balanceDue: Number(appointment.balanceDue || 0),
      amountPaid: Number(appointment.amountPaid || 0),
      paymentOption: appointment.paymentOption,
      serviceName: appointment.services.map(s => s.name).join(' + ') || 'Service',
      services: appointment.services.slice().sort((a, b) => a.executionOrder - b.executionOrder),
      client: {
        name: appointment.client?.name || '',
        email: appointment.client?.email || '',
      },
      locationId: appointment.locationId,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      timezone: appointment.timezone,
      expiresAt: appointment.expiresAt,
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointment' },
      { status: 500 }
    );
  }
}
