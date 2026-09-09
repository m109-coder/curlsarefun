import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import stripe from '@/lib/stripe/client';
import { prisma } from '@/lib/db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

/**
 * POST /api/admin/charge-balance
 *
 * Charges the remaining balance of an appointment off-session in Stripe.
 * Requires the client to have a Stripe customer ID and a saved payment
 * method. Updates the appointment's `amountPaid`, `balanceDue` and
 * `depositPaid` flags when the payment succeeds.
 *
 * Body: { appointmentId: string }
 *
 * Security: only authenticated admins can trigger off-session charges.
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
    const { appointmentId } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { client: true, services: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (Number(appointment.balanceDue) <= 0) {
      return NextResponse.json({ error: 'No remaining balance to charge' }, { status: 400 });
    }

    if (!appointment.client?.stripeCustomerId) {
      return NextResponse.json({ error: 'Customer not saved in Stripe' }, { status: 400 });
    }

    if (!appointment.stripePaymentMethodId) {
      return NextResponse.json({ error: 'No saved payment method' }, { status: 400 });
    }

    // Convert dollar balance to cents for Stripe
    const balanceDueCents = Math.round(Number(appointment.balanceDue) * 100);

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: balanceDueCents,
        currency: 'usd',
        customer: appointment.client.stripeCustomerId,
        payment_method: appointment.stripePaymentMethodId,
        off_session: true,
        confirm: true,
        description: `Remaining balance for ${appointment.services.map(s => s.name).join(' + ') || 'Service'} - ${appointment.client.name}`,
        // Attach appointment context for reconciliation and reporting
        metadata: {
          appointment_id: appointmentId,
          payment_type: 'balance_charge',
          original_payment_intent: appointment.stripePaymentIntentId || '',
        },
      });

      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json(
          { error: `Payment not succeeded: ${paymentIntent.status}` },
          { status: 402 }
        );
      }

      const amountPaid = Number(appointment.amountPaid) + Number(appointment.balanceDue);

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          amountPaid,
          balanceDue: 0,
          depositPaid: true,
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        amountPaid,
      });
    } catch (stripeError: any) {
      console.error('Stripe off-session charge failed:', stripeError);
      return NextResponse.json(
        { error: stripeError.message || 'Failed to charge remaining balance' },
        { status: 402 }
      );
    }
  } catch (error) {
    console.error('Charge balance error:', error);
    return NextResponse.json(
      { error: 'Failed to charge remaining balance' },
      { status: 500 }
    );
  }
}
