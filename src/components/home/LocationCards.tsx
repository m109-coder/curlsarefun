'use client';

import { useState } from 'react';
import { MapPin, Phone, X, Clock, ExternalLink } from 'lucide-react';
import { salonLocations } from '@/config/locations';
import type { SalonLocation } from '@/types';

function MapModal({
  location,
  onClose,
}: {
  location: SalonLocation;
  onClose: () => void;
}) {
  const mapUrl = `https://www.google.com/maps?q=${location.coordinates.lat},${location.coordinates.lng}&output=embed&z=18`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{location.name}</h3>
            <p className="text-sm text-gray-500 flex items-center mt-1">
              <Clock className="w-4 h-4 mr-1" />
              {location.timezone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close map"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Address + phone */}
        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-gray-700 font-medium">{location.address}</p>
          </div>
          <div className="flex items-center space-x-3 mt-2">
            <Phone className="w-5 h-5 text-green-600 flex-shrink-0" />
            <a href={`tel:${location.phone.replace(/-/g, '')}`} className="text-green-700 font-medium hover:underline">
              {location.phone}
            </a>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 min-h-[300px] sm:min-h-[400px] bg-gray-100 relative">
          <iframe
            title={`Map of ${location.name}`}
            src={mapUrl}
            className="w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 flex-shrink-0">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 min-h-[52px]"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Get Directions
          </a>
        </div>
      </div>
    </div>
  );
}

export function LocationCards() {
  const [selectedLocation, setSelectedLocation] = useState<SalonLocation | null>(null);

  return (
    <>
      <div className="grid md:grid-cols-3 gap-6">
        {salonLocations.map((location) => (
          <button
            key={location.id}
            onClick={() => setSelectedLocation(location)}
            className="group text-left bg-white border border-gray-200 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl hover:border-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                {location.name}
              </h3>
              <MapPin className="w-6 h-6 text-green-600 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-gray-600 mb-4 text-sm sm:text-base">{location.address}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 rounded-lg">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {location.timezone}
              </span>
              <a
                href={`tel:${location.phone.replace(/-/g, '')}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center text-green-600 hover:underline font-medium"
              >
                <Phone className="w-3.5 h-3.5 mr-1" />
                {location.phone}
              </a>
            </div>
            <div className="mt-4 text-sm font-medium text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">
              Tap to view map →
            </div>
          </button>
        ))}
      </div>

      {selectedLocation && (
        <MapModal
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
        />
      )}
    </>
  );
}
