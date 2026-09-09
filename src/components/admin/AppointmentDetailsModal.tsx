'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { X, User, MapPin, Clock, Trash2, Calendar, CheckCircle } from 'lucide-react';
import { getLocationById } from '@/config/locations';

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

interface AppointmentDetailsModalProps {
  appointmentId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

/**
 * Admin modal for viewing and editing an appointment.
 *
 * Fetches the appointment (and the location's service catalog for the edit
 * form) from `/api/admin/appointments/:id`, supports PATCH updates for
 * date/time/services/status/guests, and can cancel the appointment.
 *
 * @param appointmentId - appointment to load.
 * @param onClose - closes the modal.
 * @param onUpdate - optional callback fired after a successful edit/cancel
 *   so the parent can refresh its list.
 */
export function AppointmentDetailsModal({ appointmentId, onClose, onUpdate }: AppointmentDetailsModalProps) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    date: '',
    time: '',
    selectedServices: [] as string[],
    status: '',
    guestCount: 1,
  });

  /** Loads the appointment and seeds the edit form; also loads services. */
  const fetchAppointment = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/appointments/${appointmentId}`);
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || `Error ${response.status}: Failed to fetch appointment`);
      }
      const data = await response.json();
      if (!data.id || !data.client) throw new Error(data.error || 'Appointment not found');
      setAppointment(data);
      setEditForm({
        date: new Date(data.date).toISOString().split('T')[0],
        time: data.startTime,
        selectedServices: data.services.map((s: Service) => s.id),
        status: data.status,
        guestCount: data.guestCount,
      });
      if (data.locationId) {
        fetchServices(data.locationId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch appointment');
    } finally {
      setLoading(false);
    }
  };

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
    fetchAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  /** PATCHes the edited fields, then refreshes the displayed appointment. */
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(editForm.date).toISOString(),
          startTime: editForm.time,
          serviceIds: editForm.selectedServices,
          status: editForm.status,
          guestCount: editForm.guestCount,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || `Error ${response.status}: Failed to update appointment`);
      }

      const result = await response.json();
      if (!result.appointment) throw new Error(result.error || 'Update failed');
      setAppointment(result.appointment);
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update appointment');
    }
  };

  /** Sets the appointment status to CANCELLED after confirmation. */
  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Error ${response.status}: Failed to cancel appointment`);
      }
      onClose();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel appointment');
    }
  };

  const toggleEditService = (serviceId: string) => {
    setEditForm((prev) => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter((id) => id !== serviceId)
        : [...prev.selectedServices, serviceId],
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md">
          <p className="text-red-600">{error || 'Appointment not found'}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  const selectedServiceObjects = services
    .filter((s) => editForm.selectedServices.includes(s.id))
    .sort((a, b) => a.executionOrder - b.executionOrder);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Edit Appointment' : 'Appointment Details'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdate} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={editForm.time}
                  onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guests</label>
                <select
                  value={editForm.guestCount}
                  onChange={(e) => setEditForm({ ...editForm, guestCount: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="NO_SHOW">NO_SHOW</option>
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
                      editForm.selectedServices.includes(service.id)
                        ? 'bg-green-50 border-green-500'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={editForm.selectedServices.includes(service.id)}
                      onChange={() => toggleEditService(service.id)}
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

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                Order: {selectedServiceObjects.map((s) => s.name).join(' → ')}
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel Edit
              </button>
              <button
                type="submit"
                disabled={!editForm.selectedServices.length}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{appointment.client.name}</p>
                <p className="text-sm text-gray-500">{appointment.client.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <p className="text-gray-900">{getLocationById(appointment.locationId)?.name || appointment.locationId}</p>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <p className="text-gray-900">
                {format(new Date(appointment.date), 'MMM d, yyyy')} · {appointment.startTime} - {appointment.endTime}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Services (in order)</h3>
              <div className="space-y-2">
                {appointment.services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-900">{service.name}</span>
                    <span className="text-xs text-gray-500">{service.duration} min</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Total</p>
                <p className="font-semibold text-gray-900">${Number(appointment.totalAmount).toFixed(2)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Balance Due</p>
                <p className="font-semibold text-gray-900">${Number(appointment.balanceDue).toFixed(2)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Amount Paid</p>
                <p className="font-semibold text-gray-900">${Number(appointment.amountPaid).toFixed(2)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Status</p>
                <p className={`font-semibold ${
                  appointment.status === 'CONFIRMED' ? 'text-green-600' :
                  appointment.status === 'CANCELLED' ? 'text-gray-500' : 'text-amber-600'
                }`}>
                  {appointment.status}
                </p>
              </div>
            </div>

            {appointment.notes && (
              <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                <strong>Notes:</strong> {appointment.notes}
              </p>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              {appointment.status !== 'CANCELLED' && (
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Calendar className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
