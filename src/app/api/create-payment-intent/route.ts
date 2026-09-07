import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe/client';
import { formatAmountForStripe, createStripeMetadata } from '@/lib/stripe/client';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/create-payment-intent
 *
 * Creates a Stripe PaymentIntent for one of three payment types:
 *  - `booking`  — only the booking deposit or the full service amount.
 *  - `product`  — only physical Shopify products.
 *  - `combined` — products + booking amount in a single charge.
 *
 * Security notes:
 *  - For booking/combined the server recomputes the price from the DB; the
 *    `amount` sent by the client is only trusted for `product`-only payments.
 *  - `metadata.items` is deliberately compacted (`createStripeMetadata`) to
 *    stay under Stripe's 500-char-per-value limit.
 *  - `setup_future_usage: 'off_session'` is only sent when a Stripe customer
 *    exists — sending it without a customer was previously rejected by Stripe.
 *
 * @returns `{ clientSecret, paymentIntentId }` used by `<StripeCheckout>`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type, 
      amount, 
      paymentOption = 'deposit',
      items, 
      clientInfo, 
      appointmentId 
    } = body;

    // Validate required fields
    if (!type || amount === undefined || !clientInfo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let finalAmount = Number(amount);
    let finalAppointmentId = appointmentId;
    let description = 'Product purchase';
    let metadataType = type;
    let customerId: string | undefined;

    // Products are always paid in full. Bookings may be deposit or full.
    // The server recomputes the price; the client `amount` is only used as a
    // sanity check (it must match the recomputed total).
    let bookingAmount = 0;
    let productTotal = 0;

    // Product items have a variantId and are not the appointment placeholder.
    const productItems = (items || []).filter(
      (item: any) =>
        !item.appointmentId &&
        (item.variantId || item.variant_id) &&
        Number(item.quantity || 0) > 0
    );
    const computedProductTotal = productItems.reduce(
      (sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0
    );

    // For booking or combined payments, verify appointment exists
    if ((type === 'booking' || type === 'combined') && appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { services: true, client: true },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      // Check if appointment is still pending payment
      if (appointment.depositPaid && Number(appointment.balanceDue) <= 0) {
        return NextResponse.json(
          { error: 'Appointment already paid in full' },
          { status: 400 }
        );
      }

      const guests = appointment.guestCount || 1;
      const totalAmount = Number(appointment.totalAmount);
      const baseDeposit = appointment.services.reduce((sum, s) => sum + Number(s.depositAmount), 0);
      const depositAmount = baseDeposit * guests;
      const serviceName = appointment.services.map(s => s.name).join(' + ') || 'Service';

      // Ensure customer exists in Stripe
      const client = appointment.client;
      if (client) {
        if (client.stripeCustomerId) {
          customerId = client.stripeCustomerId;
        } else if (client.email) {
          const customer = await stripe.customers.create({
            email: client.email,
            name: client.name,
            metadata: {
              clientId: client.id,
            },
          });
          customerId = customer.id;

          await prisma.client.update({
            where: { id: client.id },
            data: { stripeCustomerId: customer.id },
          });
        }
      }

      // Determine booking amount based on payment option
      bookingAmount = paymentOption === 'full' ? totalAmount : depositAmount;

      // For booking-only, the charge is exactly the booking amount
      if (type === 'booking') {
        productTotal = 0;
        finalAmount = bookingAmount;
        description = paymentOption === 'full'
          ? `Full payment for ${serviceName} (${guests} guest${guests > 1 ? 's' : ''})`
          : `Booking deposit for ${serviceName} (${guests} guest${guests > 1 ? 's' : ''})`;
      }

      // For combined, the charge is product total (always full) + booking amount
      if (type === 'combined') {
        productTotal = computedProductTotal;
        finalAmount = productTotal + bookingAmount;

        if (productTotal < 0 || finalAmount <= 0) {
          return NextResponse.json(
            { error: 'Invalid payment amount' },
            { status: 400 }
          );
        }

        description = paymentOption === 'full'
          ? `Product purchase + full payment for ${serviceName} (${guests} guest${guests > 1 ? 's' : ''})`
          : `Product purchase + booking deposit for ${serviceName} (${guests} guest${guests > 1 ? 's' : ''})`;
      }

      // Save only the payment option; balance/due are updated on success
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { paymentOption },
      });
    } else if (type === 'product') {
      bookingAmount = 0;
      productTotal = computedProductTotal;
      finalAmount = productTotal;
    }

    // Sanity check: the client amount must match the server-computed total
    if (Math.abs(finalAmount - Number(amount)) > 0.01) {
      console.warn(`Payment amount mismatch: client=${amount}, server=${finalAmount}`);
      return NextResponse.json(
        { error: 'Payment amount mismatch. Please refresh and try again.' },
        { status: 400 }
      );
    }

    if (finalAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    const paymentIntentData: any = {
      amount: formatAmountForStripe(finalAmount),
      currency: 'usd',
      metadata: createStripeMetadata(metadataType, items, clientInfo, finalAppointmentId, paymentOption, bookingAmount, productTotal),
      automatic_payment_methods: {
        enabled: true,
      },
      description,
    };

    if (customerId) {
      paymentIntentData.customer = customerId;
      // Save payment method for future off-session charges (only for bookings with a customer)
      if (metadataType === 'booking' || metadataType === 'combined') {
        paymentIntentData.setup_future_usage = 'off_session';
      }
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    const message = error instanceof Error ? error.message : 'Failed to create payment intent';
    return NextResponse.json(
      { error: 'Failed to create payment intent', details: message },
      { status: 500 }
    );
  }
}
