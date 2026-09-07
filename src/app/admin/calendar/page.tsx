'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, startOfDay, isSameDay, isWithinInterval } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { MapPin, X, Calendar as CalendarIcon, Clock, Plus } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getLocationById } from '@/config/locations';
import { AppointmentDetailsModal } from '@/components/admin/AppointmentDetailsModal';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  depositAmount: number;
  category: string;
  executionOrder: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Appointment {
  id: string;
  locationId: string;
  client: Client;
  services: Service[];
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  status: string;
  guestCount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  depositPaid: boolean;
  notes: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Appointment;
}

const LOCATIONS = [
  { id: 'all', name: 'All Locations' },
  { id: 'new-york', name: 'New York' },
  { id: 'boston', name: 'Boston' },
  { id: 'los-angeles', name: 'Los Angeles' },
];

function combineDateTime(dateStr: string, timeStr: string): Date {
  const date = new Date(dateStr);
  const [hours, minutes] = timeStr.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export default function AdminCalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [slotStart, setSlotStart] = useState<Date | null>(null);
  const [calendarView, setCalendarView] = useState<any>(Views.WEEK);

  // Responsive calendar view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCalendarView(Views.DAY);
      } else if (window.innerWidth < 1280) {
        setCalendarView(Views.DAY);
      } else {
        setCalendarView(Views.WEEK);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create form
  const [form, setForm] = useState({
    locationId: 'new-york',
    selectedServices: [] as string[],
    guestCount: 1,
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    notes: '',
  });

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const start = startOfWeek(currentDate, { locale: enUS }).toISOString();
      const end = addDays(startOfWeek(currentDate, { locale: enUS }), 7).toISOString();
      const params = new URLSearchParams({ start, end });
      if (selectedLocation !== 'all') params.append('locationId', selectedLocation);
      const response = await fetch(`/api/admin/appointments?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, selectedLocation]);

  const fetchServices = async (locationId: string) => {
    try {
      const response = await fetch(`/api/admin/services?locationId=${locationId}`);
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    if (isCreateOpen) {
      fetchServices(form.locationId);
    }
  }, [isCreateOpen, form.locationId]);

  const events = useMemo<CalendarEvent[]>(() => {
    return appointments.map((apt) => ({
      id: apt.id,
      title: `${apt.client.name} - ${apt.services.map((s) => s.name).join(' + ')}`,
      start: combineDateTime(apt.date, apt.startTime),
      end: combineDateTime(apt.date, apt.endTime),
      resource: apt,
    }));
  }, [appointments]);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedAppointmentId(event.resource.id);
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    const date = new Date(start);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    setSlotStart(start);
    setForm({
      locationId: selectedLocation === 'all' ? 'new-york' : selectedLocation,
      selectedServices: [],
      guestCount: 1,
      name: '',
      email: '',
      phone: '',
      date: date.toISOString().split('T')[0],
      time: `${hours}:${minutes}`,
      notes: '',
    });
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: form.locationId,
          serviceIds: form.selectedServices,
          guestCount: form.guestCount,
          clientInfo: {
            name: form.name,
            email: form.email,
            phone: form.phone,
          },
          selectedDate: new Date(form.date).toISOString(),
          selectedTime: form.time,
          notes: form.notes,
        }),
      });

      if (!response.ok) throw new Error('Failed to create booking');

      setIsCreateOpen(false);
      fetchAppointments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create booking');
    }
  };

  const toggleService = (serviceId: string) => {
    setForm((prev) => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter((id) => id !== serviceId)
        : [...prev.selectedServices, serviceId],
    }));
  };

  const selectedServiceObjects = services
    .filter((s) => form.selectedServices.includes(s.id))
    .sort((a, b) => a.executionOrder - b.executionOrder);

  const totalDuration = selectedServiceObjects.reduce((sum, s) => sum + s.duration, 0) * form.guestCount;
  const totalPrice = selectedServiceObjects.reduce((sum, s) => sum + s.price, 0) * form.guestCount;

  // Upcoming 7 days agenda
  const today = startOfDay(new Date());
  const next7Days = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(today, i));
    }
    return days;
  }, [today]);

  const agenda = useMemo(() => {
    return next7Days.map((day) => ({
      day,
      appointments: appointments
        .filter((apt) => isSameDay(new Date(apt.date), day))
        .filter((apt) => selectedLocation === 'all' || apt.locationId === selectedLocation)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
  }, [appointments, next7Days, selectedLocation]);

  const CATEGORY_COLORS: Record<string, { bg: string; border: string }> = {
    haircuts: { bg: '#22c55e', border: '#16a34a' }, // green
    color: { bg: '#a855f7', border: '#9333ea' },    // purple
    styling: { bg: '#3b82f6', border: '#2563eb' },  // blue
    care: { bg: '#14b8a6', border: '#0d9488' },      // teal
    salon: { bg: '#ec4899', border: '#db2777' },     // pink
    events: { bg: '#f97316', border: '#ea580c' },    // orange
    other: { bg: '#6b7280', border: '#4b5563' },     // gray
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const status = event.resource.status;
    const services = event.resource.services || [];
    const primaryService = services.length > 0
      ? services.slice().sort((a, b) => a.executionOrder - b.executionOrder)[0]
      : null;
    const category = primaryService?.category || 'other';
    const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;

    const isOverlap = appointments.some(
      (apt) =>
        apt.id !== event.resource.id &&
        apt.locationId === event.resource.locationId &&
        isSameDay(new Date(apt.date), new Date(event.resource.date)) &&
        (apt.startTime < event.resource.endTime && apt.endTime > event.resource.startTime)
    );

    return {
      style: {
        backgroundColor: status === 'CANCELLED' ? '#6b7280' : colors.bg,
        borderLeft: `4px solid ${status === 'CANCELLED' ? '#374151' : colors.border}`,
        borderRadius: '6px',
        opacity: status === 'CANCELLED' ? 0.6 : 1,
        color: 'white',
        border: isOverlap ? '2px solid #dc2626' : 'none',
        boxShadow: isOverlap ? '0 0 0 2px rgba(220, 38, 38, 0.4)' : 'none',
        fontSize: '12px',
        fontWeight: 500,
        padding: '2px 4px',
      },
    };
  };

  return (
    <div className="space-y-4 h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Calendar</h1>
          <p className="text-gray-600">Manage appointments across all locations</p>
        </div>
        <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-gray-200">
          {LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedLocation === loc.id
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full">
        <div className="xl:col-span-3 bg-white rounded-xl shadow-sm p-4 h-[600px] xl:h-auto overflow-hidden">
          {loading && <div className="text-center py-12 text-gray-500">Loading calendar...</div>}
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            defaultView={calendarView}
            views={[Views.WEEK, Views.DAY, Views.AGENDA]}
            view={calendarView}
            onView={(v) => setCalendarView(v)}
            date={currentDate}
            onNavigate={(date: Date) => setCurrentDate(date)}
            selectable
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            eventPropGetter={eventStyleGetter}
            dayLayoutAlgorithm="no-overlap"
            min={new Date(0, 0, 0, 8, 0, 0)}
            max={new Date(0, 0, 0, 22, 0, 0)}
            step={15}
            timeslots={4}
            className="h-full"
          />
        </div>

        {/* Agenda sidebar */}
        <div className="bg-white rounded-xl shadow-sm p-4 h-[600px] xl:h-auto overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-green-600" />
            <span>Upcoming 7 Days</span>
          </h2>
          <div className="space-y-4">
            {agenda.map(({ day, appointments }) => (
              <div key={day.toISOString()}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {format(day, 'EEEE, MMM d')}
                </h3>
                {appointments.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No appointments</p>
                ) : (
                  <div className="space-y-2">
                    {appointments.map((apt) => (
                      <button
                        key={apt.id}
                        onClick={() => setSelectedAppointmentId(apt.id)}
                        className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {apt.startTime} - {apt.endTime}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            apt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                            apt.status === 'CANCELLED' ? 'bg-gray-200 text-gray-600' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 truncate">{apt.client.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {apt.services.map((s) => s.name).join(' + ')}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {getLocationById(apt.locationId)?.name || apt.locationId}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* View/Edit Modal */}
      {selectedAppointmentId && (
        <AppointmentDetailsModal
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
          onUpdate={fetchAppointments}
        />
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Create New Booking</h2>
              <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <select
                    value={form.locationId}
                    onChange={(e) => setForm({ ...form, locationId: e.target.value, selectedServices: [] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    {LOCATIONS.filter((l) => l.id !== 'all').map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Guests</label>
                  <select
                    value={form.guestCount}
                    onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {services.map((service) => (
                    <label
                      key={service.id}
                      className={`flex items-center p-3 rounded-lg cursor-pointer border ${
                        form.selectedServices.includes(service.id)
                          ? 'bg-green-50 border-green-500'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.selectedServices.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        className="mr-3"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{service.name}</p>
                        <p className="text-xs text-gray-500">{service.duration} min · ${service.price.toFixed(2)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={3}
                />
              </div>

              {selectedServiceObjects.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Order: {selectedServiceObjects.map((s) => s.name).join(' → ')}
                  </p>
                  <p className="text-sm text-gray-600">Duration: {totalDuration} min</p>
                  <p className="text-sm text-gray-600">Price: ${totalPrice.toFixed(2)}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!form.selectedServices.length || !form.date || !form.time || !form.name || !form.email || !form.phone}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create (Override)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
