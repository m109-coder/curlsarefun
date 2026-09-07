import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe/client';
import { processSuccessfulPayment } from '@/lib/fulfillment';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payment/confirm
 *
 * Called by `/booking/success` right after checkout completes. It verifies the
 * PaymentIntent **directly against Stripe** (`status === 'succeeded'`) and then
 * runs the same fulfillment logic as the webhook: confirm the appointment and
 * create the Shopify order.
 *
 * Security: the endpoint ignores any appointmentId sent by the client and only
 * uses `paymentIntent.metadata.appointment_id` — the value Stripe stored when
 * the PaymentIntent was created. `processSuccessfulPayment` is idempotent, so
 * a webhook + confirm race cannot double-charge or create duplicate orders.
 */
export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId } = await request.json();

    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Payment not succeeded (status: ${paymentIntent.status})` },
        { status: 400 }
      );
    }

    await processSuccessfulPayment(paymentIntent);

    return NextResponse.json({ confirmed: true, appointmentId: paymentIntent.metadata?.appointment_id || null });
  } catch (error) {
    console.error('[payment/confirm] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to confirm payment';
    return NextResponse.json({ error: 'Failed to confirm payment', details: message }, { status: 500 });
  }
}
