'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, DollarSign, MoreHorizontal, Check, X, Loader2, CreditCard } from 'lucide-react';

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
  service: {
    name: string;
    executionOrder: number;
  }[];
}

export default function BookingsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);
  const [charging, setCharging] = useState<string | null>(null);

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
        setSelectedAppointment(null);
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
      setSelectedAppointment(null);
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

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {appointment.client.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {appointment.client.email}
                      </div>
                      <div className="text-xs text-gray-400">
                        {appointment.client.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2 text-sm text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(appointment.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{appointment.startTime}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2 text-sm text-gray-900">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{getLocationName(appointment.locationId)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.service?.slice().sort((a, b) => a.executionOrder - b.executionOrder).map(s => s.name).join(' + ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2 text-sm text-gray-900">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span>${Number(appointment.totalAmount).toFixed(2)}</span>
                    </div>
                    {appointment.depositPaid && (
                      <span className="text-xs text-green-600">• Paid</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {Number(appointment.balanceDue) > 0 ? (
                      <span className="text-sm font-medium text-amber-600">
                        ${Number(appointment.balanceDue).toFixed(2)} due
                      </span>
                    ) : (
                      <span className="text-sm text-green-600">Fully paid</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="relative">
                      <button
                        onClick={() => setSelectedAppointment(
                          selectedAppointment === appointment.id ? null : appointment.id
                        )}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      
                      {selectedAppointment === appointment.id && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-10">
                          <div className="py-1">
                            <button
                              onClick={() => updateStatus(appointment.id, 'CONFIRMED')}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                              Confirm
                            </button>
                            <button
                              onClick={() => updateStatus(appointment.id, 'CANCELLED')}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <X className="w-4 h-4 text-red-600" />
                              Cancel
                            </button>

                            {Number(appointment.balanceDue) > 0 && (
                              <button
                                onClick={() => chargeRemainingBalance(appointment.id)}
                                disabled={charging === appointment.id}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 disabled:opacity-50"
                              >
                                {charging === appointment.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CreditCard className="w-4 h-4 text-blue-600" />
                                )}
                                Charge Remaining Balance
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No appointments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
