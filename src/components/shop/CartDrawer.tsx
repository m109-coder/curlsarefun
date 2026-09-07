'use client';

import { useState, useEffect } from 'react';
import { useCart, ActiveBooking } from '@/context/CartContext';
import { X, Plus, Minus, ShoppingBag, ChevronRight, Calendar, Clock, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span className="font-mono font-medium">{timeLeft}</span>;
}

function BookingCard({ booking }: { booking: ActiveBooking }) {
  const { removeActiveBooking, setIsOpen } = useCart();

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-green-700" />
          <span className="font-semibold text-green-900">Booking Deposit</span>
        </div>
        <button
          onClick={removeActiveBooking}
          className="p-2 hover:bg-green-100 rounded-full text-green-700 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          aria-label="Remove booking"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <h3 className="font-medium text-gray-900">{booking.serviceName}</h3>

      <div className="mt-2 space-y-1 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span>{booking.locationName}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>
            {new Date(booking.date).toLocaleDateString()} at {booking.startTime}
            {booking.guestCount > 1 && ` · ${booking.guestCount} guests`}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900">${booking.depositAmount.toFixed(2)}</span>
        <span className="text-xs text-green-800 bg-green-100 px-2 py-1 rounded-full flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <CountdownTimer expiresAt={booking.expiresAt} />
        </span>
      </div>

      <Link
        href={`/checkout?appointmentId=${booking.id}`}
        onClick={() => setIsOpen(false)}
        className="mt-3 w-full py-3 bg-green-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 hover:bg-green-700 transition-colors min-h-[48px]"
      >
        <span>Proceed to Payment</span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export function CartDrawer() {
  const {
    items,
    removeItem,
    updateQuantity,
    cartTotal,
    cartCount,
    isOpen,
    setIsOpen,
    activeBooking,
  } = useCart();

  const hasItems = items.length > 0 || !!activeBooking;
  const checkoutHref = activeBooking
    ? `/checkout?appointmentId=${activeBooking.id}`
    : '/checkout';

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-6 h-6 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">
                Cart ({cartCount})
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close cart"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!hasItems ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <ShoppingBag className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">Your cart is empty</p>
                <p className="text-sm">Add products or book an appointment</p>
              </div>
            ) : (
              <>
                {activeBooking && <BookingCard booking={activeBooking} />}

                {items.map((item) => (
                  <div key={item.variantId} className="flex space-x-4 p-3 bg-gray-50 rounded-2xl">
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.handle}`}
                        className="font-medium text-gray-900 hover:text-green-700 truncate block text-sm sm:text-base"
                      >
                        {item.title}
                      </Link>
                      <p className="text-sm text-gray-600 mt-1">
                        ${item.price.toFixed(2)}
                      </p>
                      
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className="p-2 hover:bg-white rounded-full border border-gray-200 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          className="p-2 hover:bg-white rounded-full border border-gray-200 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(item.variantId)}
                      className="p-2 hover:bg-gray-100 rounded-full self-start transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                      aria-label="Remove item"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          {hasItems && (
            <div className="border-t border-gray-100 p-4 space-y-4 bg-white">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-700">Subtotal</span>
                <span className="text-gray-900">${cartTotal.toFixed(2)}</span>
              </div>
              
              <p className="text-sm text-gray-600">
                {activeBooking
                  ? 'Booking deposit included. Product shipping and taxes calculated at checkout.'
                  : 'Shipping and taxes calculated at checkout'}
              </p>

              <Link
                href={checkoutHref}
                onClick={() => setIsOpen(false)}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all duration-200 min-h-[56px]"
              >
                <span>Checkout</span>
                <ChevronRight className="w-5 h-5" />
              </Link>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-3 text-gray-700 hover:text-gray-900 font-medium min-h-[48px]"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
