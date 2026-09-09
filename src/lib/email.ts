import { DateTime } from 'luxon';

interface ServiceLike {
  id: string;
  name: string;
  duration: number;
  executionOrder: number;
}

interface ClientLike {
  name: string;
  email: string;
}

interface AppointmentLike {
  id: string;
  locationId: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  timezone: string;
  guestCount: number;
  totalAmount: number;
}

export interface ItineraryItem {
  startTime: string;
  endTime: string;
  name: string;
  durationMinutes: number;
}

/**
 * Builds a per-service itinerary starting at `startTime`.
 *
 * @remarks
 * - Services are executed in `executionOrder`; each start time is the
 *   cumulative end of the previous service (no gaps between services).
 * - Each service's duration is multiplied by `guestCount` (every guest
 *   receives the service sequentially).
 * - A final "cleanup" entry of `bufferMinutes` is appended — displayed in the
 *   confirmation email so clients see the full chair time.
 *
 * @param services - Booked services (unsorted input is fine).
 * @param startTime - `"HH:mm"` salon-local appointment start.
 * @param guestCount - Number of guests; scales each service duration.
 * @param bufferMinutes - Cleanup buffer appended at the end (default 15).
 * @returns Ordered list of `{ startTime, endTime, name, durationMinutes }`.
 */
export function generateItinerary(
  services: ServiceLike[],
  startTime: string,
  guestCount: number,
  bufferMinutes = 15
): ItineraryItem[] {
  const sortedServices = [...services].sort((a, b) => a.executionOrder - b.executionOrder);
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  let currentMinutes = startHours * 60 + startMinutes;

  const items: ItineraryItem[] = sortedServices.map((service) => {
    const duration = service.duration * guestCount;
    const endMinutes = currentMinutes + duration;

    const item: ItineraryItem = {
      startTime: minutesToTime(currentMinutes),
      endTime: minutesToTime(endMinutes),
      name: service.name,
      durationMinutes: duration,
    };

    currentMinutes = endMinutes;
    return item;
  });

  // Append cleanup/buffer entry at the end
  const cleanupStart = currentMinutes;
  const cleanupEnd = cleanupStart + bufferMinutes;
  items.push({
    startTime: minutesToTime(cleanupStart),
    endTime: minutesToTime(cleanupEnd),
    name: 'Finalización y Limpieza',
    durationMinutes: bufferMinutes,
  });

  return items;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function formatTime12Hour(time24: string): string {
  const [hours24, minutes] = time24.split(':').map(Number);
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Renders the inline-HTML confirmation email (table-based for email client
 * compatibility). The appointment date is formatted in the appointment's own
 * timezone via Luxon, not the server's local zone.
 */
function buildConfirmationHtml(
  appointment: AppointmentLike,
  services: ServiceLike[],
  client: ClientLike
): string {
  const itinerary = generateItinerary(services, appointment.startTime, appointment.guestCount);
  const dateStr = DateTime.fromJSDate(new Date(appointment.date), { zone: appointment.timezone }).toFormat('MMMM d, yyyy');

  const itineraryRows = itinerary
    .map((item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${formatTime12Hour(item.startTime)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.durationMinutes} min</td>
      </tr>
    `)
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
      <h1 style="color: #16a34a;">Booking Confirmed</h1>
      <p>Hi ${client.name},</p>
      <p>Your appointment on <strong>${dateStr}</strong> at <strong>${formatTime12Hour(appointment.startTime)}</strong> has been confirmed.</p>
      
      <h2 style="margin-top: 24px; font-size: 18px;">Itinerary</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; text-align: left;">Time</th>
            <th style="padding: 8px; text-align: left;">Service</th>
            <th style="padding: 8px; text-align: right;">Duration</th>
          </tr>
        </thead>
        <tbody>
          ${itineraryRows}
        </tbody>
      </table>

      <p style="margin-top: 24px;"><strong>Guests:</strong> ${appointment.guestCount}</p>
      <p><strong>Total:</strong> $${Number(appointment.totalAmount).toFixed(2)}</p>
      <p><strong>Appointment ID:</strong> ${appointment.id}</p>

      <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
        If you need to reschedule or cancel, please contact us as soon as possible.
      </p>
    </div>
  `;
}

/**
 * Sends the booking confirmation email via the Resend HTTP API.
 *
 * @remarks
 * When `RESEND_API_KEY` is not configured the email is logged to the console
 * and reported as success — this keeps local/dev flows working without a
 * provider and must not break the payment flow. Callers typically attach
 * `.catch()` and treat delivery as best-effort.
 *
 * @returns `{ success: true }` on send (or dev log), `{ success: false,
 *   message }` on provider/transport errors — it never throws.
 */
export async function sendBookingConfirmation(
  appointment: AppointmentLike,
  services: ServiceLike[],
  client: ClientLike
): Promise<{ success: boolean; message?: string }> {
  const html = buildConfirmationHtml(appointment, services, client);
  const subject = `Your CurlsAreFun appointment is confirmed - ${appointment.startTime}`;

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.log('[EMAIL] Resend API key not configured. Skipping email send.');
    console.log('[EMAIL] Subject:', subject);
    console.log('[EMAIL] HTML preview:', html.slice(0, 200), '...');
    return { success: true, message: 'Email logged (provider not configured)' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'CurlsAreFun <bookings@curlsarefun.com>',
        to: client.email,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send booking confirmation email:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
