'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Calendar, MapPin, Clock, CreditCard, Download, Home, CalendarDays, Package } from 'lucide-react';
import { DateTime } from 'luxon';
import { getLocationById } from '@/config/locations';

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  executionOrder: number;
}

interface Appointment {
  id: string;
  locationId: string;
  status: string;
  guestCount: number;
  totalAmount: number;
  depositAmount: number;
  balanceDue: number;
  amountPaid: number;
  paymentOption: string;
  services: Service[];
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
}

interface ProductItem {
  variantId: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
}

/**
 * Combines the appointment's ISO date and "HH:mm" start/end time into a
 * Luxon `DateTime` in the salon's timezone. Returns `null` on bad input.
 */
function parseAppointmentDate(dateStr: string, timeStr: string, timezone: string): DateTime | null {
  const datePart = dateStr.split('T')[0];
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (!datePart || !Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const dt = DateTime.fromISO(datePart, { zone: timezone }).set({
    hour: hours,
    minute: minutes,
    second: 0,
    millisecond: 0,
  });

  return dt.isValid ? dt : null;
}

/** Formats a numeric amount as USD, e.g. `$25.00`. */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Escapes special characters per the iCalendar (RFC 5545) spec. */
function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Builds a downloadable `.ics` VCALENDAR/VEVENT payload for the appointment. */
function generateIcs(
  title: string,
  start: DateTime,
  end: DateTime,
  description: string,
  location: string,
  uid: string
): string {
  const format = (dt: DateTime) => dt.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const now = DateTime.utc().toFormat("yyyyMMdd'T'HHmmss'Z'");

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Curls Are Fun//Appointment//EN',
    'BEGIN:VEVENT',
    `UID:${uid}@curlsarefun.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${format(start)}`,
    `DTEND:${format(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Post-payment success screen (rendered inside a `Suspense` boundary because
 * it reads search params).
 *
 * Reads `bookingId`, `payment`, `amountPaid`, `productTotal` and `items` from
 * the query string, confirms the payment server-side (mirrors the Stripe
 * webhook fulfillment, idempotent), fetches the appointment, and shows the
 * summary plus "Add to Calendar" links (Google Calendar URL and .ics file).
 */
function BookingSuccessPageContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const paymentId = searchParams.get('payment');
  const amountPaidParam = searchParams.get('amountPaid');
  const productTotalParam = searchParams.get('productTotal');
  const itemsParam = searchParams.get('items');

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(!!bookingId);
  const [error, setError] = useState<string | null>(null);

  const productItems: ProductItem[] = useMemo(() => {
    if (!itemsParam) return [];
    try {
      const parsed = JSON.parse(itemsParam);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [itemsParam]);

  const amountPaidFromQuery = amountPaidParam ? Number(amountPaidParam) : 0;
  const productTotalFromQuery = productTotalParam ? Number(productTotalParam) : 0;

  // Confirm the payment server-side right after checkout. This runs the same
  // fulfillment as the Stripe webhook (confirm appointment + create Shopify
  // order) so orders are created immediately even if the webhook is not yet
  // configured. The operation is idempotent.
  useEffect(() => {
    if (!paymentId) return;
    fetch('/api/payment/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId: paymentId }),
    }).catch((err) => {
      console.error('Payment confirmation request failed:', err);
    });
  }, [paymentId]);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    const fetchAppointment = async () => {
      try {
        const response = await fetch(`/api/appointments/${bookingId}`);
        if (!response.ok) throw new Error('Failed to fetch appointment');
        const data = await response.json();
        setAppointment(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load appointment');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [bookingId]);

  const startDate = useMemo(() => {
    if (!appointment) return null;
    return parseAppointmentDate(appointment.date, appointment.startTime, appointment.timezone);
  }, [appointment]);

  const endDate = useMemo(() => {
    if (!appointment) return null;
    return parseAppointmentDate(appointment.date, appointment.endTime, appointment.timezone);
  }, [appointment]);

  const googleCalendarUrl = useMemo(() => {
    if (!appointment || !startDate || !endDate) return '';
    const start = startDate.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
    const end = endDate.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
    const location = getLocationById(appointment.locationId)?.address || '';
    const details = `Services: ${appointment.services.map((s) => s.name).join(', ')}\nGuests: ${appointment.guestCount}\nBalance Due: ${formatCurrency(appointment.balanceDue)}`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Cita en Curls Are Fun - ${getLocationById(appointment.locationId)?.name || appointment.locationId}`,
      dates: `${start}/${end}`,
      details,
      location,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [appointment, startDate, endDate]);

  const downloadIcs = () => {
    if (!appointment || !startDate || !endDate) return;
    const location = getLocationById(appointment.locationId)?.address || '';
    const title = `Cita en Curls Are Fun - ${getLocationById(appointment.locationId)?.name || appointment.locationId}`;
    const description = [
      `Services: ${appointment.services.map((s) => s.name).join(', ')}`,
      `Guests: ${appointment.guestCount}`,
      `Total: ${formatCurrency(appointment.totalAmount)}`,
      `Amount Paid: ${formatCurrency(displayAmountPaid)}`,
      `Balance Due: ${formatCurrency(displayBalanceDue)}`,
      paymentId ? `Payment Reference: ${paymentId}` : '',
    ].join('\n');

    const ics = generateIcs(title, startDate, endDate, description, location, appointment.id);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `curlsarefun-appointment-${appointment.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Prefer the server's recorded amount; fall back to the query param when
  // the appointment record hasn't been updated yet
  const displayAmountPaid = appointment && appointment.amountPaid > 0
    ? appointment.amountPaid
    : amountPaidFromQuery;

  const displayBalanceDue = appointment
    ? (appointment.totalAmount - displayAmountPaid)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!bookingId || error || !appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful</h1>
          <p className="text-gray-600 mb-6">
            {error ? `We couldn't load your appointment details: ${error}` : 'Thank you! Your order/appointment has been confirmed.'}
          </p>
          {productItems.length > 0 && (
            <div className="text-left mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Products purchased</h3>
              <div className="space-y-2">
                {productItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-900">{item.title} x{item.quantity}</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Link
            href="/"
            className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    );
  }

  const location = getLocationById(appointment.locationId);
  const sortedServices = appointment.services.slice().sort((a, b) => a.executionOrder - b.executionOrder);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Success header */}
        <div className="bg-white rounded-xl shadow-sm p-8 text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Confirmed</h1>
          <p className="text-gray-600">
            Thank you! Your appointment at <span className="font-semibold text-gray-900">{location?.name || appointment.locationId}</span> has been confirmed.
          </p>
        </div>

        {/* Appointment summary */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-green-600" />
            <span>Appointment Summary</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                <CalendarDays className="w-4 h-4" />
                <span>Date</span>
              </div>
              <p className="font-medium text-gray-900">
                {startDate ? startDate.toLocaleString(DateTime.DATE_MED) : '—'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                <Clock className="w-4 h-4" />
                <span>Time</span>
              </div>
              <p className="font-medium text-gray-900">
                {startDate && endDate
                  ? `${startDate.toFormat('h:mm a')} - ${endDate.toFormat('h:mm a')}`
                  : `${appointment.startTime} - ${appointment.endTime}`}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                <MapPin className="w-4 h-4" />
                <span>Location</span>
              </div>
              <p className="font-medium text-gray-900">{location?.name || appointment.locationId}</p>
              {location?.address && (
                <p className="text-xs text-gray-500 mt-1">{location.address}</p>
              )}
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                <CreditCard className="w-4 h-4" />
                <span>Payment</span>
              </div>
              <p className="font-medium text-gray-900">
                {appointment.paymentOption === 'full' ? 'Paid in full' : 'Deposit paid'}
              </p>
            </div>
          </div>

          <h3 className="text-sm font-medium text-gray-700 mb-3">Services</h3>
          <div className="space-y-2 mb-6">
            {sortedServices.map((service) => (
              <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-900">{service.name}</span>
                <span className="text-xs text-gray-500">{service.duration} min</span>
              </div>
            ))}
            {appointment.guestCount > 1 && (
              <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                {appointment.guestCount} guests
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total</span>
              <span className="font-semibold text-gray-900">{formatCurrency(appointment.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Amount Paid</span>
              <span className="font-semibold text-green-600">{formatCurrency(displayAmountPaid)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Balance Due</span>
              <span className={`font-semibold ${displayBalanceDue > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                {formatCurrency(displayBalanceDue)}
              </span>
            </div>
            {paymentId && (
              <p className="text-xs text-gray-400 mt-3 break-all">Payment reference: {paymentId}</p>
            )}
          </div>
        </div>

        {/* Products section */}
        {productItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Package className="w-5 h-5 text-green-600" />
              <span>Products</span>
            </h2>
            <div className="space-y-3">
              {productItems.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  {item.image && (
                    <img src={item.image} alt={item.title} className="w-12 h-12 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-gray-600">Product Total</span>
              <span className="font-semibold text-gray-900">{formatCurrency(productTotalFromQuery)}</span>
            </div>
          </div>
        )}

        {/* Add to calendar */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add to Calendar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>Google Calendar</span>
            </a>
            <button
              onClick={downloadIcs}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Apple / Outlook (.ics)</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <Link
            href="/booking"
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Another</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Booking success page. Wraps the content in `Suspense` since
 * `useSearchParams` requires it under static rendering.
 */
export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>}>
      <BookingSuccessPageContent />
    </Suspense>
  );
}
