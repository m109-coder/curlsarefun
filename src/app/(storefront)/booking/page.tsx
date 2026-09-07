'use client';

import React, { useState, useEffect } from 'react';
import { LocationSelector } from '@/components/booking/LocationSelector';
import { ServiceSelector } from '@/components/booking/ServiceSelector';
import { BookingCalendar } from '@/components/booking/BookingCalendar';
import { getLocationById } from '@/config/locations';
import { calculateEndTime } from '@/lib/booking/timezone';
import { useCart } from '@/context/CartContext';

type BookingStep = 'location' | 'service' | 'guests' | 'calendar' | 'info' | 'summary' | 'confirmation';

export default function BookingPage() {
  const [currentStep, setCurrentStep] = useState<BookingStep>('location');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [guestCount, setGuestCount] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [appointment, setAppointment] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setActiveBooking } = useCart();

  // Scroll to top whenever the active step changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const location = getLocationById(selectedLocation);
  const services = (location?.services || []).slice().sort((a, b) => a.executionOrder - b.executionOrder);
  const selectedServiceObjects = services.filter(s => selectedServices.includes(s.id));

  const baseDuration = selectedServiceObjects.reduce((sum, s) => sum + s.duration, 0) || 60;
  const basePrice = selectedServiceObjects.reduce((sum, s) => sum + Number(s.price), 0);
  const baseDeposit = selectedServiceObjects.reduce((sum, s) => sum + Number(s.depositAmount), 0);

  // Formula: (base duration * guestCount) + 15 min buffer applied at the end
  const totalDuration = baseDuration * guestCount;
  const totalPrice = basePrice * guestCount;
  const totalDeposit = baseDeposit * guestCount;

  const handleNext = () => {
    const steps: BookingStep[] = ['location', 'service', 'guests', 'calendar', 'info', 'summary', 'confirmation'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: BookingStep[] = ['location', 'service', 'guests', 'calendar', 'info', 'summary', 'confirmation'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleServiceToggle = (service: { id: string; duration: number; price: number; depositAmount: number }) => {
    setSelectedServices(prev => 
      prev.includes(service.id)
        ? prev.filter(id => id !== service.id)
        : [...prev, service.id]
    );
  };

  const handleServiceRemove = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(id => id !== serviceId));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'location':
        return !!selectedLocation;
      case 'service':
        return selectedServices.length > 0;
      case 'guests':
        return guestCount >= 1;
      case 'calendar':
        return !!selectedDate && !!selectedTime;
      case 'info':
        return !!clientInfo.name && !!clientInfo.email && !!clientInfo.phone;
      default:
        return true;
    }
  };

  const handleBookingConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: selectedLocation,
          serviceIds: selectedServices,
          guestCount,
          clientInfo,
          selectedDate: selectedDate?.toISOString(),
          selectedTime,
          notes: clientInfo.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create appointment');
      }

      setAppointment(data.appointment);

      // Add booking deposit to global cart
      const appointmentData = data.appointment;
      setActiveBooking({
        id: appointmentData.id,
        serviceName: selectedServiceObjects.map(s => s.name).join(' + ') || 'Service',
        locationId: appointmentData.locationId,
        locationName: location?.name || appointmentData.locationId,
        date: appointmentData.date,
        startTime: appointmentData.startTime,
        guestCount: appointmentData.guestCount || guestCount,
        depositAmount: Number(appointmentData.depositAmount || totalDeposit),
        totalAmount: Number(appointmentData.totalAmount || totalPrice),
        expiresAt: appointmentData.expiresAt,
      });

      // Redirect to unified checkout with appointment deposit
      window.location.href = `/checkout?appointmentId=${data.appointment.id}`;
    } catch (error) {
      console.error('Failed to create appointment:', error);
      alert(error instanceof Error ? error.message : 'Failed to create appointment. Please try again.');
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'location':
        return (
          <LocationSelector
            selectedLocation={selectedLocation}
            onLocationSelect={setSelectedLocation}
          />
        );
      case 'service':
        return (
          <ServiceSelector
            locationId={selectedLocation}
            selectedServices={selectedServices}
            onServiceToggle={handleServiceToggle}
            onServiceRemove={handleServiceRemove}
            onContinue={handleNext}
          />
        );
      case 'guests':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">How many people?</h2>
            <p className="text-gray-600">
              Select the number of guests for <strong>{selectedServiceObjects.map(s => s.name).join(' + ')}</strong>. Duration and price will be multiplied.
            </p>

            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of guests</label>
              <select
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[52px] text-base"
              >
                <option value={1}>Just me</option>
                <option value={2}>2 people</option>
                <option value={3}>3 people</option>
                <option value={4}>4 people</option>
                <option value={5}>5 people</option>
              </select>
            </div>

            <div className="bg-gray-50 p-5 rounded-2xl">
              <p className="text-sm text-gray-600">Base services duration: {baseDuration} min</p>
              <p className="text-sm text-gray-600">Base price per person: ${basePrice.toFixed(2)}</p>
              <p className="text-lg font-bold text-gray-900 mt-2">
                Total: ${totalPrice.toFixed(2)} — {totalDuration} min (+15 min buffer)
              </p>
            </div>
          </div>
        );
      case 'calendar':
        return (
          <BookingCalendar
            key={`${selectedLocation}-${guestCount}-${selectedServices.join(',')}`}
            locationId={selectedLocation}
            serviceDuration={totalDuration}
            onDateSelect={setSelectedDate}
            onTimeSelect={setSelectedTime}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
          />
        );
      case 'info':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Information</h2>
              <p className="text-gray-600 text-sm mt-1">Please provide your contact details</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={clientInfo.name}
                  onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[52px]"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={clientInfo.email}
                  onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[52px]"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={clientInfo.phone}
                  onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[52px]"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                <textarea
                  value={clientInfo.notes}
                  onChange={(e) => setClientInfo({ ...clientInfo, notes: e.target.value })}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );
      case 'summary':
        const endTime = selectedTime
          ? calculateEndTime(selectedTime, totalDuration, selectedLocation)
          : '';
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Booking Summary</h2>
            
            <div className="bg-gray-50 p-5 rounded-2xl space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Location</h3>
                <p className="text-gray-800 font-medium">{location?.name}</p>
                <p className="text-sm text-gray-500">{location?.address}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Services</h3>
                <div className="space-y-1">
                  {selectedServiceObjects.map(service => (
                    <p key={service.id} className="text-gray-700">{service.name}</p>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Guests</h3>
                <p className="text-gray-700">{guestCount} {guestCount === 1 ? 'person' : 'people'}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Date & Time</h3>
                <p className="text-gray-700">
                  {selectedDate?.toLocaleDateString()} at {selectedTime} ({location?.timezone})
                </p>
                {endTime && (
                  <p className="text-sm text-gray-500">Estimated end time: {endTime} (includes 15 min buffer)</p>
                )}
              </div>
              
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-primary">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-500">Deposit required</span>
                  <span className="font-semibold text-gray-900">${totalDeposit.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleBookingConfirm}
              disabled={isSubmitting}
              className="w-full py-4 bg-primary text-white rounded-full font-body font-semibold hover:bg-primary-dark transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2 min-h-[56px]"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <span>Proceed to Payment</span>
              )}
            </button>
          </div>
        );
      case 'confirmation':
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-4">
              Your appointment has been created and is pending payment confirmation.
            </p>
            <div className="bg-gray-50 p-6 rounded-lg inline-block text-left">
              <p className="text-sm text-gray-600">
                <strong>Appointment ID:</strong> {appointment?.id}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Status:</strong> {appointment?.status}
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 sm:pb-0">
        {/* Progress Steps */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between overflow-x-auto no-scrollbar">
            {['Location', 'Service', 'Guests', 'Date & Time', 'Info', 'Summary'].map((step, index) => {
              const steps: BookingStep[] = ['location', 'service', 'guests', 'calendar', 'info', 'summary'];
              const currentStepIndex = steps.indexOf(currentStep);
              
              return (
                <div key={step} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${index <= currentStepIndex
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {index + 1}
                  </div>
                  <span className={`
                    ml-2 text-sm font-medium hidden sm:block
                    ${index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'}
                  `}>
                    {step}
                  </span>
                  {index < 5 && (
                    <div className={`
                      w-12 h-0.5 mx-4
                      ${index < currentStepIndex ? 'bg-primary' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-8">
          {renderStep()}

          {/* Desktop Navigation Buttons */}
          {currentStep !== 'confirmation' && currentStep !== 'service' && (
            <div className="hidden md:flex justify-between mt-8 pt-6 border-t">
              {currentStep !== 'location' && (
                <button
                  onClick={handleBack}
                  className="px-6 py-3 border border-primary text-primary rounded-full font-body font-medium hover:bg-tertiary/50 transition-all duration-200 min-h-[48px]"
                >
                  Back
                </button>
              )}
              {currentStep !== 'summary' && (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="ml-auto px-8 py-3 bg-primary text-white rounded-full font-body font-semibold hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 min-h-[48px]"
                >
                  Next
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      {currentStep !== 'confirmation' && currentStep !== 'service' && (
        <div className="fixed md:hidden bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30 safe-area-pb">
          <div className="flex items-center gap-3">
            {currentStep !== 'location' && (
              <button
                onClick={handleBack}
                className="flex-shrink-0 px-4 py-3.5 border border-primary text-primary rounded-full font-body font-medium hover:bg-tertiary/50 transition-all duration-200 min-h-[52px] min-w-[52px]"
              >
                Back
              </button>
            )}
            {currentStep !== 'summary' && (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1 py-3.5 bg-primary text-white rounded-full font-body font-semibold hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 min-h-[52px]"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
