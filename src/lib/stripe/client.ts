import Stripe from 'stripe';

/**
 * Singleton Stripe server client. `STRIPE_SECRET_KEY` must be a **test** key in
 * staging/preview (`sk_test_...`).
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
  typescript: true,
});

export default stripe;

/** Converts a USD amount to Stripe's integer cents representation. */
export function formatAmountForStripe(amount: number): number {
  return Math.round(amount * 100); // Convert to cents
}

/** Converts a Stripe integer cents amount back to USD. */
export function formatAmountFromStripe(amount: number): number {
  return amount / 100; // Convert from cents
}

/**
 * Builds the `metadata` object attached to every PaymentIntent.
 *
 * @remarks
 * Stripe caps each metadata **value** at 500 characters. Sending the full cart
 * (titles, image URLs, descriptions) exceeded that limit, so items are
 * compacted to `{"v": variantId, "q": quantity, "p": price}` and the webhook
 * (`handlePaymentSucceeded`) knows how to decode this compact shape.
 *
 * The booking part is identified by `appointment_id` + `payment_option`, and
 * `booking_amount`/`product_total` let the webhook split a combined charge.
 */
export function createStripeMetadata(
  paymentType: string,
  items: any[],
  clientInfo: { email: string; name: string },
  appointmentId?: string,
  paymentOption?: string,
  bookingAmount?: number,
  productTotal?: number
): Record<string, string> {
  // Extract appointmentId from items if not provided directly
  const directAppointmentId = appointmentId || '';
  const itemAppointmentId = items.find((item) => item.appointmentId)?.appointmentId || '';

  // Stripe metadata values are limited to 500 characters each.
  // Compact product items to variant_id, quantity and price only.
  const compactItems = items
    .filter((item) => !item.appointmentId)
    .map((item) => ({
      v: String(item.variantId || item.variant_id || '').replace(/\\D/g, ''),
      q: Number(item.quantity || 1),
      p: Number(item.price || 0),
    }))
    .filter((item) => item.v);

  return {
    payment_type: paymentType,
    payment_option: paymentOption || '',
    items: JSON.stringify(compactItems),
    client_email: clientInfo.email,
    client_name: clientInfo.name,
    appointment_id: directAppointmentId || itemAppointmentId,
    booking_amount: String(bookingAmount || ''),
    product_total: String(productTotal || ''),
    created_at: new Date().toISOString(),
  };
}