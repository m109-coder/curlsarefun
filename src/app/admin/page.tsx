'use client';

import { useEffect, useState } from 'react';
import { Calendar, ShoppingBag, TrendingUp, DollarSign, Users, Clock, X, Plus, MapPin, ChevronRight } from 'lucide-react';
import { getLocationById } from '@/config/locations';
import { AppointmentDetailsModal } from '@/components/admin/AppointmentDetailsModal';
import { OrderDetailsModal } from '@/components/admin/OrderDetailsModal';

interface DashboardData {
  totalBookings: number;
  totalOrders: number;
  revenue: number;
  activeClients: number;
  todaySchedule: ScheduleItem[];
  recentActivity: any[];
}

interface ScheduleItem {
  id: string;
  time: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  clientName: string;
  serviceName: string;
  status: string;
}

interface ServiceOption {
  id: string;
  name: string;
  duration: number;
  price: number;
  depositAmount: number;
  category: string;
  executionOrder: number;
}

interface BookingForm {
  locationId: string;
  selectedServices: string[];
  guestCount: number;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  notes: string;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function groupScheduleIntoRows(items: ScheduleItem[]): ScheduleItem[][] {
  const sorted = [...items].sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
  const rows: ScheduleItem[][] = [];

  sorted.forEach((item) => {
    let placed = false;
    for (const row of rows) {
      const last = row[row.length - 1];
      if (item.startMinutes >= last.endMinutes) {
        row.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      rows.push([item]);
    }
  });

  return rows;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [creating, setCreating] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [form, setForm] = useState<BookingForm>({
    locationId: 'new-york',
    selectedServices: [],
    guestCount: 1,
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    notes: '',
  });

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      fetchServices(form.locationId);
    }
  }, [isModalOpen, form.locationId]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async (locationId: string) => {
    try {
      const response = await fetch(`/api/admin/services?locationId=${locationId}`);
      if (response.ok) {
        const result = await response.json();
        setServices(result);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);

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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking');
      }

      setIsModalOpen(false);
      setForm({
        locationId: 'new-york',
        selectedServices: [],
        guestCount: 1,
        name: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        notes: '',
      });
      fetchDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setCreating(false);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  const stats = [
    { name: 'Total Bookings', value: data?.totalBookings || 0, change: '+0%', icon: Calendar, color: 'bg-blue-500' },
    { name: 'Total Orders', value: data?.totalOrders || 0, change: '+0%', icon: ShoppingBag, color: 'bg-green-500' },
    { name: 'Revenue', value: `$${(data?.revenue || 0).toLocaleString()}`, change: '+0%', icon: DollarSign, color: 'bg-purple-500' },
    { name: 'Active Clients', value: data?.activeClients || 0, change: '+0%', icon: Users, color: 'bg-orange-500' },
  ];

  const todaySchedule = data?.todaySchedule || [];
  const recentActivity = data?.recentActivity || [];
  const scheduleRows = groupScheduleIntoRows(todaySchedule);
  const maxColumns = Math.max(1, ...scheduleRows.map((row) => row.length));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your salon operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">{stat.change}</span>
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <button
                key={activity.id}
                onClick={() => {
                  if (activity.type === 'booking') {
                    setSelectedBookingId(activity.id);
                  } else if (activity.type === 'order') {
                    setSelectedOrderId(activity.id);
                  }
                }}
                className="w-full flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-left group"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activity.type === 'booking' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {activity.type === 'booking' ? (
                    <Calendar className="w-4 h-4 text-blue-600" />
                  ) : (
                    <ShoppingBag className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 group-hover:text-green-700 transition-colors">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No recent activity to display.</p>
        )}
      </div>

      {/* Quick Actions & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left flex items-center space-x-3"
            >
              <Calendar className="w-5 h-5" />
              <span>Create New Booking</span>
            </button>
            <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left flex items-center space-x-3">
              <Users className="w-5 h-5" />
              <span>Add New Client</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Schedule</h2>
          {todaySchedule.length > 0 ? (
            <div className="space-y-2">
              {scheduleRows.map((row, rowIndex) => (
                <div key={rowIndex} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${maxColumns}, minmax(0, 1fr))` }}>
                  {row.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        item.status === 'CONFIRMED' ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2 text-sm font-medium text-gray-900">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{item.time}</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-1 truncate">{item.serviceName}</p>
                      <p className="text-xs text-gray-500">{item.clientName}</p>
                      {row.length > 1 && (
                        <span className="inline-block mt-1 text-xs text-amber-600 font-medium bg-amber-100 px-2 py-0.5 rounded">
                          Overlap
                        </span>
                      )}
                    </div>
                  ))}
                  {Array.from({ length: maxColumns - row.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="hidden lg:block" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No appointments scheduled for today.</p>
          )}
        </div>
      </div>

      {/* Create Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Create New Booking</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <select
                  value={form.locationId}
                  onChange={(e) => setForm({ ...form, locationId: e.target.value, selectedServices: [] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="new-york">New York</option>
                  <option value="boston">Boston</option>
                  <option value="los-angeles">Los Angeles</option>
                </select>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <p className="text-sm text-gray-600">Services order: {selectedServiceObjects.map((s) => s.name).join(' → ')}</p>
                  <p className="text-sm text-gray-600">Total duration: {totalDuration} min</p>
                  <p className="text-sm text-gray-600">Total price: ${totalPrice.toFixed(2)}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || form.selectedServices.length === 0 || !form.date || !form.time || !form.name || !form.email || !form.phone}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Booking (Override)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedBookingId && (
        <AppointmentDetailsModal
          appointmentId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          onUpdate={fetchDashboard}
        />
      )}

      {selectedOrderId && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}
