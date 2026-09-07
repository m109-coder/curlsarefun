import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe/client';
import { formatAmountFromStripe } from '@/lib/stripe/client';
import { prisma } from '@/lib/db/prisma';
import { sendBookingConfirmation } from '@/lib/email';
import { createShopifyOrder, createShopifyDraftOrder } from '@/lib/shopify/admin-client';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

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
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
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

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);

  const metadata = paymentIntent.metadata;
  const paymentType = metadata.payment_type;
  const paymentOption = metadata.payment_option || 'deposit';

  const amountReceivedDollars = formatAmountFromStripe(paymentIntent.amount_received);
  const productTotalFromMetadata = Number(metadata.product_total || 0);
  const bookingAmountFromMetadata = Number(metadata.booking_amount || 0);

  // Determine how much of the received amount is for the booking vs products
  const productAmountPaid = Math.min(productTotalFromMetadata, amountReceivedDollars);
  const bookingAmountPaid = Math.max(0, amountReceivedDollars - productAmountPaid);

  const appointmentId = metadata.appointment_id;
  let appointment: any = null;

  if ((paymentType === 'booking' || paymentType === 'combined') && appointmentId) {
    appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { services: true, client: true },
    });

    if (appointment) {
      const totalAmount = Number(appointment.totalAmount);
      const baseDeposit = appointment.services.reduce((sum: number, s: any) => sum + Number(s.depositAmount), 0);
      const depositAmount = baseDeposit * (appointment.guestCount || 1);
      const expectedBookingAmount = paymentOption === 'full' ? totalAmount : depositAmount;
      // Use actual received allocation, capped at expected booking amount for balance calculation
      const effectiveBookingPaid = Math.min(bookingAmountPaid, expectedBookingAmount);
      const balanceDue = Math.max(0, totalAmount - effectiveBookingPaid);

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'CONFIRMED',
          depositPaid: effectiveBookingPaid >= depositAmount,
          amountPaid: effectiveBookingPaid,
          balanceDue,
          paymentOption,
          stripePaymentIntentId: paymentIntent.id,
          stripePaymentMethodId: (paymentIntent.payment_method as string) || undefined,
          expiresAt: null,
        },
      });

      // Save customer id on client for future off-session charges
      if (paymentIntent.customer) {
        await prisma.client.update({
          where: { id: appointment.clientId },
          data: { stripeCustomerId: paymentIntent.customer as string },
        });
      }

      // Send confirmation email with detailed itinerary
      if (appointment.client) {
        sendBookingConfirmation(
          { ...appointment, totalAmount: Number(appointment.totalAmount) },
          appointment.services,
          appointment.client
        ).catch((err) => {
          console.error('Failed to send confirmation email:', err);
        });
      }

      console.log(`Appointment ${appointmentId} confirmed. Paid: ${effectiveBookingPaid}, Balance: ${balanceDue}`);
    }
  }

  // Create a unified Shopify order for products and/or services
  if (paymentType === 'product' || paymentType === 'combined' || appointment) {
    const rawItems = metadata.items ? JSON.parse(metadata.items) : [];
    const productItems: any[] = Array.isArray(rawItems)
      ? rawItems.map((item: any) => ({
          variantId: item.v,
          quantity: Number(item.q || 1),
          price: Number(item.p || 0),
        }))
      : [];
    const lineItems: any[] = [];

    // Add product line items from cart
    for (const item of productItems) {
      const numericVariantId = item.variantId ? String(item.variantId).replace(/\\D/g, '') : '';

      if (!numericVariantId) {
        console.warn('Skipping product item without variant_id:', item);
        continue;
      }

      lineItems.push({
        variant_id: Number(numericVariantId),
        quantity: item.quantity || 1,
      });
    }

    // Add service line items if a booking was paid
    if (appointment) {
      const sortedServices = appointment.services.slice().sort((a: any, b: any) => a.executionOrder - b.executionOrder);
      const serviceNames = sortedServices.map((s: any) => s.name).join(' + ');

      for (const service of sortedServices) {
        lineItems.push({
          title: service.name,
          quantity: appointment.guestCount || 1,
          price: Number(service.price).toFixed(2),
          properties: [
            { name: 'Appointment', value: appointment.id },
            { name: 'Date', value: `${appointment.date} ${appointment.startTime}` },
            { name: 'Service', value: serviceNames },
          ],
        });
      }
    }

    if (lineItems.length > 0) {
      const orderTotal = productTotalFromMetadata + (appointment ? Number(appointment.totalAmount) : 0);
      const financialStatus = amountReceivedDollars >= orderTotal ? 'paid' : 'partially_paid';

      try {
        const shopifyOrder = await createShopifyOrder({
          line_items: lineItems,
          financial_status: financialStatus,
          note: `Curls Are Fun order. Payment ref: ${paymentIntent.id}. ${appointment ? `Booking ${appointment.id} (${paymentOption}).` : ''}`,
          send_receipt: false,
          send_fulfillment_receipt: false,
          tags: 'curlsarefun, combined',
        });

        if (appointment) {
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { shopifyOrderId: String(shopifyOrder.id) },
          });
        }

        console.log(`[Webhook] Shopify order created: ${shopifyOrder.id}`);
      } catch (orderError) {
        console.error('[Webhook] Shopify order creation failed, attempting Draft Order fallback. Error:', orderError);

        // Fallback: create a Draft Order so the admin can at least see it
        try {
          const draftOrder = await createShopifyDraftOrder({
            line_items: lineItems,
            note: `Curls Are Fun draft order. Payment ref: ${paymentIntent.id}. ${appointment ? `Booking ${appointment.id} (${paymentOption}).` : ''}`,
            tags: 'curlsarefun, combined',
          });

          console.log(`[Webhook] Shopify draft order created as fallback: ${draftOrder.id}`);
        } catch (draftOrderError) {
          console.error('[Webhook] Shopify draft order fallback also failed:', draftOrderError);
        }
      }
    }
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