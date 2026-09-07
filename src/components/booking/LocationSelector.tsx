'use client';

import React from 'react';
import { Building2, Landmark, Sun, MapPin, Clock, Phone } from 'lucide-react';
import { salonLocations } from '@/config/locations';

interface LocationSelectorProps {
  selectedLocation: string;
  onLocationSelect: (locationId: string) => void;
}

export function LocationSelector({
  selectedLocation,
  onLocationSelect,
}: LocationSelectorProps) {
  const getLocationIcon = (locationId: string) => {
    switch (locationId) {
      case 'new-york':
        return <Building2 className="w-8 h-8" />;
      case 'boston':
        return <Landmark className="w-8 h-8" />;
      case 'los-angeles':
        return <Sun className="w-8 h-8" />;
      default:
        return <MapPin className="w-8 h-8" />;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Select Location</h2>
      <p className="text-gray-600">Choose the salon location you'd like to visit</p>
      
      <div className="grid md:grid-cols-3 gap-4">
        {salonLocations.map(location => (
          <button
            key={location.id}
            onClick={() => onLocationSelect(location.id)}
            className={`
              relative p-5 rounded-2xl border-2 transition-all duration-200 text-left min-h-[120px] flex flex-col justify-between
              ${selectedLocation === location.id
                ? 'border-primary bg-tertiary/50 shadow-lg'
                : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
          >
            <div className="flex flex-col h-full">
              {/* Icon */}
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center mb-4
                ${selectedLocation === location.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                {getLocationIcon(location.id)}
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {location.name}
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">{location.address}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-600">{location.timezone}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-600">{location.phone}</span>
                  </div>
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedLocation === location.id && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}