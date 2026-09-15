'use client';

import { useEffect, useState } from 'react';
import { Scissors, Plus, Pencil, Trash2, Loader2, X, Check } from 'lucide-react';

const LOCATIONS = [
  { id: 'new-york', name: 'New York' },
  { id: 'boston', name: 'Boston' },
  { id: 'los-angeles', name: 'Los Angeles' },
];

const CATEGORIES = ['care', 'color', 'haircuts', 'styling', 'salon', 'events'];

interface Service {
  id: string;
  locationId: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  depositAmount: number;
  category: string;
  executionOrder: number;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>(LOCATIONS[0].id);

  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<Partial<Service>>({
    locationId: LOCATIONS[0].id,
    name: '',
    description: '',
    duration: 60,
    price: 0,
    depositAmount: 0,
    category: 'haircuts',
    executionOrder: 99,
  });

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    setForm((f) => ({ ...f, locationId: selectedLocation }));
  }, [selectedLocation]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/services');
      const data = await res.json();
      if (data.services) setServices(data.services);
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setMessage('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      locationId: selectedLocation,
      name: '',
      description: '',
      duration: 60,
      price: 0,
      depositAmount: 0,
      category: 'haircuts',
      executionOrder: 99,
    });
  };

  const startEdit = (service: Service) => {
    setEditing(service);
    setForm({ ...service });
    setSelectedLocation(service.locationId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.locationId) return;

    setSaving(true);
    setMessage(null);

    try {
      const url = editing ? `/api/admin/services/${editing.id}` : '/api/admin/services';
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      setMessage(editing ? 'Service updated' : 'Service created');
      resetForm();
      fetchServices();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setMessage('Service deleted');
      fetchServices();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const filtered = services.filter((s) => s.locationId === selectedLocation);

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
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-600">Manage services by salon location</p>
        </div>
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <Scissors className="w-5 h-5 text-green-700" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label className="text-sm font-medium text-gray-700">
            Location
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="mt-1 block w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </label>
          <button
            onClick={resetForm}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New service</span>
          </button>
        </div>

        {message && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm">{message}</div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border border-gray-200 rounded-xl p-4 bg-gray-50">
          <div className="md:col-span-2 lg:col-span-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              {editing ? 'Edit service' : 'New service'}
            </h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category || 'haircuts'}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
            <input
              type="number"
              min={5}
              step={5}
              value={form.duration || 0}
              onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.price || 0}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deposit ($)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.depositAmount || 0}
              onChange={(e) => setForm({ ...form, depositAmount: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Execution order</label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.executionOrder || 99}
              onChange={(e) => setForm({ ...form, executionOrder: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex items-center space-x-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{editing ? 'Update service' : 'Create service'}</span>
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center space-x-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((service) => (
            <div
              key={service.id}
              className="group relative bg-white rounded-xl shadow-sm p-5 border border-gray-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 truncate">{service.name}</h3>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                    {service.category}
                  </span>
                </div>
                <span className="text-lg font-bold text-green-700">
                  ${Number(service.price).toFixed(2)}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center justify-between">
                  <span>Duration</span>
                  <span className="font-medium text-gray-900">{service.duration} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Deposit</span>
                  <span className="font-medium text-gray-900">${Number(service.depositAmount).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Execution order</span>
                  <span className="font-medium text-gray-900">{service.executionOrder}</span>
                </div>
                {service.description && (
                  <p className="text-xs text-gray-500 pt-1 line-clamp-2">{service.description}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => startEdit(service)}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3 text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
              No services for this location yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
