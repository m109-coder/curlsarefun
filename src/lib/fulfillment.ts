import Stripe from 'stripe';
import { formatAmountFromStripe } from '@/lib/stripe/client';
import { prisma } from '@/lib/db/prisma';
import { sendBookingConfirmation } from '@/lib/email';
import { createShopifyOrder, createShopifyDraftOrder } from '@/lib/shopify/admin-client';

/**
 * Processes a successful Stripe PaymentIntent:
 *  1. Confirms the appointment in Prisma (if one is attached via metadata).
 *  2. Creates the Shopify order, falling back to a Draft Order on rejection.
 *
 * This function is shared by the Stripe webhook (`/api/webhooks/stripe`) and
 * the post-checkout confirmation endpoint (`/api/payment/confirm`), so an
 * order is created even when the webhook has not been configured yet.
 *
 * Idempotency: if the appointment already carries this paymentIntentId, the
 * handler returns early and no duplicate Shopify order is created.
 *
 * @param paymentIntent - A `succeeded` PaymentIntent (verified by the caller).
 */
export async function processSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
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
      // Idempotency guard: the same payment must not confirm twice
      if (appointment.stripePaymentIntentId === paymentIntent.id && appointment.status === 'CONFIRMED') {
        console.log(`[Payment] Appointment ${appointmentId} already confirmed by ${paymentIntent.id}`);
      } else {
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
  }

  // Skip Shopify order creation if this appointment already has one
  if (appointment?.shopifyOrderId) {
    console.log(`[Payment] Appointment ${appointment.id} already has Shopify order ${appointment.shopifyOrderId}`);
    return;
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
      const numericVariantId = item.variantId ? String(item.variantId).replace(/\D/g, '') : '';

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

        console.log(`[Payment] Shopify order created: ${shopifyOrder.id}`);
      } catch (orderError) {
        console.error('[Payment] Shopify order creation failed, attempting Draft Order fallback. Error:', orderError);

        // Fallback: create a Draft Order so the admin can at least see it
        try {
          const draftOrder = await createShopifyDraftOrder({
            line_items: lineItems,
            note: `Curls Are Fun draft order. Payment ref: ${paymentIntent.id}. ${appointment ? `Booking ${appointment.id} (${paymentOption}).` : ''}`,
            tags: 'curlsarefun, combined',
          });

          console.log(`[Payment] Shopify draft order created as fallback: ${draftOrder.id}`);
        } catch (draftOrderError) {
          console.error('[Payment] Shopify draft order fallback also failed:', draftOrderError);
        }
      }
    }
  }
}
