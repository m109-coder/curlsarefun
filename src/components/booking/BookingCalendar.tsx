'use client';

import React, { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight, Globe, Clock } from 'lucide-react';
import { 
  getUserTimezone,
  formatInSalonTimezone,
  isLocationOpenOnDate,
} from '@/lib/booking/timezone';
import { getLocationById } from '@/config/locations';

interface BookingCalendarProps {
  locationId: string;
  serviceDuration: number;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
  selectedDate?: Date;
  selectedTime?: string;
}

export function BookingCalendar({
  locationId,
  serviceDuration,
  onDateSelect,
  onTimeSelect,
  selectedDate,
  selectedTime,
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(DateTime.local());
  const [useUserTimezone, setUseUserTimezone] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const location = getLocationById(locationId);
  const userTimezone = getUserTimezone();

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedDate) return;
      
      try {
        setLoadingSlots(true);
        const params = new URLSearchParams({
          locationId,
          date: selectedDate.toISOString(),
          serviceDuration: String(serviceDuration),
        });
        
        const response = await fetch(`/api/availability?${params.toString()}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load availability');
        }
        
        setAvailableSlots(data.slots || []);
      } catch (err) {
        console.error('Failed to load availability:', err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, locationId, serviceDuration]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => 
      direction === 'prev' ? prev.minus({ months: 1 }) : prev.plus({ months: 1 })
    );
  };

  const getDaysInMonth = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const days = [];

    const startDay = startOfMonth.weekday;
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let i = 0; i < endOfMonth.day; i++) {
      days.push(startOfMonth.plus({ days: i }));
    }

    return days;
  };

  const isDateSelectable = (date: DateTime) => {
    if (!date) return false;
    if (date < DateTime.local().startOf('day')) return false;
    return isLocationOpenOnDate(locationId, date);
  };

  const handleDateClick = (date: DateTime) => {
    if (!isDateSelectable(date)) return;
    onDateSelect(date.toJSDate());
  };

  const formatTimeForDisplay = (time: string) => {
    if (useUserTimezone) {
      const salonDateTime = DateTime.fromFormat(time, 'HH:mm', { zone: location?.timezone });
      const userDateTime = salonDateTime.setZone(userTimezone);
      return userDateTime.toFormat('h:mm a');
    }
    return DateTime.fromFormat(time, 'HH:mm').toFormat('h:mm a');
  };

  return (
    <div className="space-y-6">
      {/* Timezone Notice */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <Globe className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Showing times in <strong>{location?.timezone}</strong>
              </p>
              <p className="text-xs text-blue-700">
                {useUserTimezone 
                  ? `Converting to your timezone (${userTimezone})`
                  : 'Salon local time'
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => setUseUserTimezone(!useUserTimezone)}
            className="text-sm text-blue-700 hover:text-blue-900 font-medium underline self-start sm:self-auto"
          >
            {useUserTimezone ? 'Show salon time' : 'Use my timezone'}
          </button>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => navigateMonth('prev')}
          className="flex items-center justify-center w-12 h-12 rounded-2xl hover:bg-gray-100 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">
          {currentMonth.toFormat('MMMM yyyy')}
        </h3>
        <button
          onClick={() => navigateMonth('next')}
          className="flex items-center justify-center w-12 h-12 rounded-2xl hover:bg-gray-100 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-500 py-2">
            {day}
          </div>
        ))}
        
        {getDaysInMonth().map((date, index) => {
          if (!date) return <div key={index} className="p-2 min-h-[48px]" />;
          
          const isSelected = selectedDate && DateTime.fromJSDate(selectedDate).hasSame(date, 'day');
          const isSelectable = isDateSelectable(date);
          const isToday = date.hasSame(DateTime.local(), 'day');

          return (
            <button
              key={date.toISO()}
              onClick={() => handleDateClick(date)}
              disabled={!isSelectable}
              className={`
                flex items-center justify-center min-h-[48px] rounded-xl text-sm font-semibold transition-all duration-200
                ${isSelected 
                  ? 'bg-green-600 text-white shadow-md' 
                  : isSelectable 
                  ? 'hover:bg-gray-100 text-gray-900 active:scale-95' 
                  : 'text-gray-300 cursor-not-allowed'
                }
                ${isToday && !isSelected ? 'border-2 border-green-600' : ''}
              `}
            >
              {date.day}
            </button>
          );
        })}
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="space-y-4">
          <h4 className="text-lg font-bold text-gray-900">
            Available times for {formatInSalonTimezone(selectedDate, locationId, 'MMMM d')}
          </h4>
          
          {loadingSlots ? (
            <div className="flex items-center justify-center space-x-2 py-6 text-gray-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
              <span>Loading available times...</span>
            </div>
          ) : availableSlots.length === 0 ? (
            <p className="text-gray-500 text-center py-6 bg-gray-50 rounded-2xl">
              No available slots for this date
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {availableSlots.map(time => (
                <button
                  key={time}
                  onClick={() => onTimeSelect(time)}
                  className={`
                    py-3.5 px-2 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[52px]
                    ${selectedTime === time
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900 active:scale-95'
                    }
                  `}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatTimeForDisplay(time)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
