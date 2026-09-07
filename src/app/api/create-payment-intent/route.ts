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

    let bookingAmount = 0;
    let productTotal = finalAmount;

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
      bookingAmount = depositAmount;
      if (paymentOption === 'full') {
        bookingAmount = totalAmount;
      }

      // For booking-only, use the selected booking amount
      if (type === 'booking') {
        finalAmount = bookingAmount;
        productTotal = 0;
        description = paymentOption === 'full'
          ? `Full payment for ${serviceName} (${guests} guest${guests > 1 ? 's' : ''})`
          : `Booking deposit for ${serviceName} (${guests} guest${guests > 1 ? 's' : ''})`;
      }

      // For combined, trust the passed amount (it should include cart + booking)
      // but ensure it's at least the booking amount
      if (type === 'combined') {
        productTotal = Number(amount) - bookingAmount;

        if (productTotal < 0) {
          return NextResponse.json(
            { error: 'Invalid payment amount' },
            { status: 400 }
          );
        }

        finalAmount = productTotal + bookingAmount;
        description = paymentOption === 'full'
          ? `Product purchase + full payment for ${serviceName} (${guests} guest${guests > 1 ? 's' : ''})`
          : `Product purchase + booking deposit for ${serviceName} (${guests} guest${guests > 1 ? 's' : ''})`;
      }

      // Update appointment payment option and balance due for the user-facing state
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          paymentOption,
          balanceDue: paymentOption === 'full' ? 0 : totalAmount - bookingAmount,
        },
      });
    } else if (type === 'product') {
      bookingAmount = 0;
      productTotal = finalAmount;
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
