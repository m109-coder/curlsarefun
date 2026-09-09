'use client';

import React from 'react';
import { Scissors, Heart, Sparkles, MessageSquare, Clock, Droplets, Palette, User, X, Check, Plus } from 'lucide-react';
import { getLocationById } from '@/config/locations';
import { Service } from '@/types';

interface ServiceSelectorProps {
  locationId: string;
  selectedServices: string[];
  onServiceToggle: (service: Service) => void;
  onServiceRemove: (serviceId: string) => void;
  onContinue: () => void;
}

/** Visual config (label, icon, colors) per service category. */
const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string; badge: string }> = {
  care: { label: 'Care', icon: <Droplets className="w-6 h-6" />, color: 'bg-tertiary text-primary', badge: 'bg-tertiary text-green-800' },
  color: { label: 'Color', icon: <Palette className="w-6 h-6" />, color: 'bg-purple-100 text-purple-600', badge: 'bg-purple-100 text-purple-800' },
  haircuts: { label: 'Haircuts', icon: <Scissors className="w-6 h-6" />, color: 'bg-blue-100 text-blue-600', badge: 'bg-blue-100 text-blue-800' },
  salon: { label: 'Salón', icon: <Heart className="w-6 h-6" />, color: 'bg-pink-100 text-pink-600', badge: 'bg-pink-100 text-pink-800' },
  styling: { label: 'Styling', icon: <Sparkles className="w-6 h-6" />, color: 'bg-yellow-100 text-yellow-600', badge: 'bg-yellow-100 text-yellow-800' },
  events: { label: 'Events', icon: <MessageSquare className="w-6 h-6" />, color: 'bg-orange-100 text-orange-600', badge: 'bg-orange-100 text-orange-800' },
  other: { label: 'Other', icon: <User className="w-6 h-6" />, color: 'bg-gray-100 text-gray-600', badge: 'bg-gray-100 text-gray-800' },
};

/** Returns the visual config for a category, defaulting to 'other'. */
function getCategoryConfig(category: string) {
  return categoryConfig[category] || categoryConfig.other;
}

/**
 * Step 2 of the booking wizard: multi-select service picker.
 *
 * Shows the services offered by the selected location (sorted by
 * `executionOrder`) with per-service price/deposit/duration, plus a live
 * summary sidebar (desktop) and a sticky bottom bar (mobile) with totals.
 *
 * @param locationId - location whose services are listed.
 * @param selectedServices - ids of currently selected services.
 * @param onServiceToggle - add/remove a service.
 * @param onServiceRemove - remove a service from the summary list.
 * @param onContinue - advance to the next step.
 */
export function ServiceSelector({
  locationId,
  selectedServices,
  onServiceToggle,
  onServiceRemove,
  onContinue,
}: ServiceSelectorProps) {
  const location = getLocationById(locationId);
  // Services are displayed/executed in a fixed order defined by executionOrder
  const services = (location?.services || []).slice().sort((a, b) => a.executionOrder - b.executionOrder);
  const selectedServiceObjects = services.filter(s => selectedServices.includes(s.id));

  const totalDuration = selectedServiceObjects.reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = selectedServiceObjects.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDeposit = selectedServiceObjects.reduce((sum, s) => sum + Number(s.depositAmount), 0);

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Service Grid */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Services</h2>
          <p className="text-gray-600 mb-5">Choose one or more services for your appointment</p>

          <div className="grid md:grid-cols-2 gap-4">
            {services.map(service => {
              const isSelected = selectedServices.includes(service.id);
              const config = getCategoryConfig(service.category);

              return (
                <button
                  key={service.id}
                  onClick={() => onServiceToggle(service)}
                  className={`
                    p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 text-left relative min-h-[120px]
                    active:scale-[0.99]
                    ${isSelected
                      ? 'border-primary bg-tertiary/50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                  `}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`
                      w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'bg-primary text-white' : config.color}
                    `}>
                      {config.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 text-base leading-tight">{service.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${config.badge}`}>
                          {config.label}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {service.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-gray-900">${Number(service.price).toFixed(2)}</span>
                            {Number(service.depositAmount) > 0 && (
                              <span className="text-xs text-gray-500">(${Number(service.depositAmount).toFixed(2)} deposit)</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>{service.duration} min</span>
                          </div>
                        </div>

                        <div className={`
                          w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                          ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}
                        `}>
                          {isSelected ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Appointment Summary Sidebar (desktop) */}
        <div className="hidden lg:block lg:w-80">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sticky top-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Heart className="w-5 h-5 text-primary" />
              <span>Your Appointment</span>
            </h3>

            {selectedServiceObjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Scissors className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Select services to see your appointment summary</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {selectedServiceObjects.map(service => (
                    <div key={service.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{service.name}</p>
                        <p className="text-xs text-gray-500">{service.duration} min · ${Number(service.price).toFixed(2)}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onServiceRemove(service.id);
                        }}
                        className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-red-500 ml-2 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        aria-label={`Remove ${service.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total duration</span>
                    <span className="font-medium">{totalDuration} min</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total price</span>
                    <span className="font-medium">${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Deposit required</span>
                    <span className="font-medium text-primary">${totalDeposit.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={onContinue}
                  disabled={selectedServiceObjects.length === 0}
                  className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px]"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Selected Summary + Sticky Continue */}
      {selectedServiceObjects.length > 0 && (
        <div className="fixed md:hidden bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30 safe-area-pb">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-600">{selectedServiceObjects.length} service(s)</p>
              <p className="font-bold text-gray-900">${totalPrice.toFixed(2)} · {totalDuration} min</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Deposit</p>
              <p className="font-semibold text-primary">${totalDeposit.toFixed(2)}</p>
            </div>
          </div>
          <button
            onClick={onContinue}
            disabled={selectedServiceObjects.length === 0}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px]"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
