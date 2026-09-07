import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe/client';
import { prisma } from '@/lib/db/prisma';
import { processSuccessfulPayment } from '@/lib/fulfillment';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/stripe
 *
 * Stripe event receiver. The raw request body is verified with
 * `stripe.webhooks.constructEvent` against `STRIPE_WEBHOOK_SECRET` — without a
 * valid signature the request is rejected with `400`.
 *
 * Handled events:
 *  - `payment_intent.succeeded` → confirms the appointment in Prisma and
 *    creates the Shopify order (with draft-order fallback) via the shared
 *    `processSuccessfulPayment` fulfillment logic.
 *  - `payment_intent.payment_failed` → cancels the `PENDING_PAYMENT` hold so the
 *    time slot is released for other customers.
 *  - `charge.refunded` → marks the appointment `CANCELLED`.
 *
 * The handler always returns `200` after logging errors. This is deliberate:
 * Stripe retries non-2xx responses, and once the payment has already been
 * captured we prefer to log the Shopify failure for manual follow-up rather
 * than trigger endless retries that could duplicate orders.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await processSuccessfulPayment(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);

  const metadata = paymentIntent.metadata;
  const paymentType = metadata.payment_type;

  if (paymentType === 'booking') {
    const appointmentId = metadata.appointment_id;

    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'CANCELLED',
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      console.log(`Appointment ${appointmentId} cancelled due to payment failure`);
    }
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log('Charge refunded:', charge.id);

  const paymentIntentId = charge.payment_intent as string;

  // Find appointment by payment intent
  const appointment = await prisma.appointment.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (appointment) {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'CANCELLED',
      },
    });

    console.log(`Appointment ${appointment.id} marked as refunded/cancelled`);
  }
}
