'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, DollarSign, Check, X, Loader2, CreditCard, Phone, Mail, Pencil } from 'lucide-react';
import { AppointmentDetailsModal } from '@/components/admin/AppointmentDetailsModal';

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  locationId: string;
  status: string;
  depositPaid: boolean;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  client: {
    name: string;
    email: string;
    phone: string;
  };
  services: {
    name: string;
    executionOrder: number;
  }[];
}

export default function BookingsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [charging, setCharging] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/admin/appointments');
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setAppointments(appointments.map(apt =>
          apt.id === appointmentId ? { ...apt, status: newStatus } : apt
        ));
      }
    } catch (error) {
      console.error('Failed to update appointment:', error);
    }
  };

  const chargeRemainingBalance = async (appointmentId: string) => {
    if (charging) return;
    setCharging(appointmentId);

    try {
      const response = await fetch('/api/admin/charge-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to charge balance');
      }

      setAppointments(appointments.map(apt =>
        apt.id === appointmentId
          ? { ...apt, balanceDue: 0, amountPaid: apt.totalAmount, depositPaid: true }
          : apt
      ));
      alert('Remaining balance charged successfully');
    } catch (error) {
      console.error('Failed to charge balance:', error);
      alert(error instanceof Error ? error.message : 'Failed to charge balance');
    } finally {
      setCharging(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getLocationName = (locationId: string) => {
    const locations: Record<string, string> = {
      'new-york': 'New York',
      'boston': 'Boston',
      'los-angeles': 'Los Angeles',
    };
    return locations[locationId] || locationId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600">Manage and track all appointments</p>
        </div>
        <button
          onClick={fetchAppointments}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {appointments.map((appointment) => {
          const serviceNames = appointment.services
            ?.slice()
            .sort((a, b) => a.executionOrder - b.executionOrder)
            .map(s => s.name)
            .join(' + ') || 'No service';

          return (
            <div
              key={appointment.id}
              className="group relative bg-white rounded-xl shadow-sm p-5 border border-gray-200 hover:shadow-md transition-all"
            >
              {/* Header: status + location */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span>{getLocationName(appointment.locationId)}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(appointment.status)}`}>
                  {appointment.status}
                </span>
              </div>

              {/* Client */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 truncate">{appointment.client.name}</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{appointment.client.email}</span>
                </div>
                {appointment.client.phone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{appointment.client.phone}</span>
                  </div>
                )}
              </div>

              {/* Date & service */}
              <div className="space-y-3 mb-4">
                <div className="flex items-start space-x-3 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p>{new Date(appointment.date).toLocaleDateString()}</p>
                    <div className="flex items-center space-x-1 text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{appointment.startTime}</span>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-700">
                  <span className="font-medium text-gray-900">Service:</span>{' '}
                  <span className="text-gray-600">{serviceNames}</span>
                </div>
              </div>

              {/* Amount & balance */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-4 mb-2">
                <div className="flex items-center space-x-2 text-gray-900 font-semibold">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span>${Number(appointment.totalAmount).toFixed(2)}</span>
                </div>
                {Number(appointment.balanceDue) > 0 ? (
                  <span className="text-sm font-medium text-amber-600">
                    ${Number(appointment.balanceDue).toFixed(2)} due
                  </span>
                ) : (
                  <span className="text-sm text-green-600 font-medium">Fully paid</span>
                )}
              </div>

              {/* Hover action buttons */}
              <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 bg-white border-t border-gray-100 rounded-b-xl p-3 shadow-lg flex items-center justify-between gap-2 z-10">
                {appointment.status !== 'CONFIRMED' && (
                  <button
                    onClick={() => updateStatus(appointment.id, 'CONFIRMED')}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm</span>
                  </button>
                )}

                {appointment.status !== 'CANCELLED' && (
                  <button
                    onClick={() => updateStatus(appointment.id, 'CANCELLED')}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                )}

                {Number(appointment.balanceDue) > 0 && (
                  <button
                    onClick={() => chargeRemainingBalance(appointment.id)}
                    disabled={charging === appointment.id}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {charging === appointment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    <span>Charge</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedBookingId(appointment.id)}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              </div>

              {/* Reserve space so the hover bar does not overlap content below */}
              <div className="h-12" />
            </div>
          );
        })}

        {appointments.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
            No appointments found
          </div>
        )}
      </div>

      {selectedBookingId && (
        <AppointmentDetailsModal
          appointmentId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          onUpdate={fetchAppointments}
        />
      )}
    </div>
  );
}
