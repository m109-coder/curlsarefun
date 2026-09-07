'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { StripeCheckout } from '@/components/stripe/StripeCheckout';
import Link from 'next/link';
import { Loader2, Calendar, Shield, Clock } from 'lucide-react';

interface AppointmentInfo {
  id: string;
  serviceName: string;
  guestCount: number;
  depositAmount: number;
  totalAmount: number;
  balanceDue: number;
  amountPaid: number;
  paymentOption: string | null;
  status: string;
  depositPaid: boolean;
  date: string;
  startTime: string;
  expiresAt: string | null;
  client: {
    name: string;
    email: string;
  };
}

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get('appointmentId');
  const { items, cartTotal, cartCount, clearCart, activeBooking, removeActiveBooking } = useCart();

  const [appointment, setAppointment] = useState<AppointmentInfo | null>(null);
  const [loadingAppointment, setLoadingAppointment] = useState(false);
  const [appointmentError, setAppointmentError] = useState<string | null>(null);
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full'>('deposit');

  useEffect(() => {
    if (appointmentId) {
      fetchAppointment(appointmentId);
    }
  }, [appointmentId]);

  const fetchAppointment = async (id: string) => {
    try {
      setLoadingAppointment(true);
      setAppointmentError(null);
      const response = await fetch(`/api/appointments/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch appointment');
      }

      if (data.depositPaid && data.balanceDue <= 0) {
        throw new Error('This appointment has already been paid in full');
      }

      setAppointment(data);
      setPaymentOption(data.depositPaid ? 'full' : 'deposit');
    } catch (err) {
      console.error('Failed to fetch appointment:', err);
      setAppointmentError(err instanceof Error ? err.message : 'Failed to fetch appointment');
    } finally {
      setLoadingAppointment(false);
    }
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    const query = new URLSearchParams();
    if (appointment?.id) query.set('bookingId', appointment.id);
    if (paymentIntentId) query.set('payment', paymentIntentId);
    query.set('amountPaid', amountToPay.toFixed(2));
    query.set('productTotal', productTotal.toFixed(2));
    if (items.length > 0) {
      query.set('items', JSON.stringify(items));
    }

    clearCart();
    removeActiveBooking();
    router.push('/booking/success?' + query.toString());
  };

  const depositAmount = appointment && !appointment.depositPaid ? appointment.depositAmount : 0;
  const remainingBalance = appointment?.balanceDue || 0;

  const amountToPay = paymentOption === 'deposit'
    ? depositAmount
    : (appointment?.totalAmount || 0);

  const hasProducts = items.length > 0;
  const hasBooking = !!appointment && amountToPay > 0;
  const isBookingInCart = activeBooking?.id === appointment?.id;
  const productTotal = isBookingInCart ? cartTotal - depositAmount : cartTotal;
  const totalAmount = productTotal + amountToPay;

  const paymentItems = [
    ...items.map((item) => ({
      name: item.title,
      price: item.price,
      quantity: item.quantity,
      variantId: item.variantId,
    })),
    ...(appointment
      ? [
          {
            name: paymentOption === 'deposit'
              ? `Deposit for ${appointment.serviceName}`
              : `Full payment for ${appointment.serviceName}`,
            price: amountToPay,
            quantity: 1,
            appointmentId: appointment.id,
            paymentOption,
          },
        ]
      : []),
  ];

  const paymentType = hasProducts && hasBooking ? 'combined' : hasBooking ? 'booking' : 'product';
  const clientInfo = appointment?.client || { name: '', email: '' };

  if (items.length === 0 && !appointmentId) {
    return (
      <div className="min-h-screen bg-gray-50 overflow-x-hidden py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-gray-600 mb-6">Add items to your cart or book an appointment to proceed.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/products"
                className="px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all min-h-[52px] flex items-center justify-center"
              >
                Shop Products
              </Link>
              <Link
                href="/booking"
                className="px-6 py-3.5 border border-green-600 text-green-600 rounded-xl font-semibold hover:bg-green-50 transition-all min-h-[52px] flex items-center justify-center"
              >
                Book Appointment
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-8 lg:p-10">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Checkout</h1>
            <p className="text-gray-600 text-sm sm:text-base">Complete your payment securely</p>
          </div>

          {/* Order Summary - Mobile optimized */}
          <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Order Summary</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.variantId} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                  <div className="flex items-center space-x-3 min-w-0">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-xl flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.title}</p>
                      <p className="text-xs sm:text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}

              {appointment && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{appointment.serviceName}</p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {new Date(appointment.date).toLocaleDateString()} at {appointment.startTime}
                      </p>
                      {appointment.guestCount > 1 && (
                        <p className="text-xs text-gray-500">{appointment.guestCount} guests</p>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">${amountToPay.toFixed(2)}</p>
                </div>
              )}

              {loadingAppointment && (
                <div className="flex items-center space-x-2 py-3 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading appointment...</span>
                </div>
              )}

              {appointmentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {appointmentError}
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-gray-700 text-sm sm:text-base">Items ({cartCount})</span>
                <span className="font-semibold text-gray-900">${totalAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-900 font-semibold text-base sm:text-lg">Total to pay now</span>
                <span className="text-xl sm:text-2xl font-bold text-green-700">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {appointment && !appointment.depositPaid && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Payment Option</h2>
              <div className="space-y-3">
                <label className="flex items-start p-4 border rounded-xl cursor-pointer hover:bg-gray-50 has-[:checked]:border-green-500 has-[:checked]:bg-green-50 transition-colors">
                  <input
                    type="radio"
                    name="paymentOption"
                    value="deposit"
                    checked={paymentOption === 'deposit'}
                    onChange={(e) => setPaymentOption(e.target.value as 'deposit' | 'full')}
                    className="mt-1 mr-3 w-5 h-5 min-w-[20px] min-h-[20px]"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Pay deposit only</p>
                    <p className="text-sm text-gray-600">
                      Pay ${depositAmount.toFixed(2)} now. Remaining balance of ${(appointment.totalAmount - depositAmount).toFixed(2)} can be paid later.
                    </p>
                  </div>
                </label>

                <label className="flex items-start p-4 border rounded-xl cursor-pointer hover:bg-gray-50 has-[:checked]:border-green-500 has-[:checked]:bg-green-50 transition-colors">
                  <input
                    type="radio"
                    name="paymentOption"
                    value="full"
                    checked={paymentOption === 'full'}
                    onChange={(e) => setPaymentOption(e.target.value as 'deposit' | 'full')}
                    className="mt-1 mr-3 w-5 h-5 min-w-[20px] min-h-[20px]"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Pay full amount</p>
                    <p className="text-sm text-gray-600">
                      Pay the full ${(appointment.totalAmount).toFixed(2)} now.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {totalAmount > 0 ? (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 hidden sm:block">Payment Information</h2>
              <StripeCheckout
                amount={totalAmount}
                paymentType={paymentType as any}
                paymentOption={paymentOption}
                items={paymentItems}
                clientInfo={clientInfo}
                appointmentId={appointment?.id}
                onSuccess={handlePaymentSuccess}
                onCancel={() => window.history.back()}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nothing to pay at this time.
            </div>
          )}

          {appointment && (
            <div className="mt-6 sm:mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-4 sm:p-5 flex items-start space-x-3">
              <Clock className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900 mb-1">Booking Hold Active</h3>
                <p className="text-sm text-blue-700">
                  Complete payment by {appointment.expiresAt ? new Date(appointment.expiresAt).toLocaleTimeString() : 'soon'} to confirm your appointment.
                </p>
              </div>
            </div>
          )}

          {!appointment && (
            <div className="mt-6 sm:mt-8 bg-green-50 border border-green-100 rounded-2xl p-4 sm:p-5 flex items-start space-x-3">
              <Shield className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-green-900 mb-1">Secure Payment</h3>
                <p className="text-sm text-green-700">Powered by Stripe — PCI compliant. Your payment information is encrypted.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>}>
      <CheckoutPageContent />
    </Suspense>
  );
}
