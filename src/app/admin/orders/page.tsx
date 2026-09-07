'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, Package, Clock, DollarSign, CheckCircle, XCircle, Loader2, ShieldAlert } from 'lucide-react';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface ShopifyMoney {
  amount: string;
  currencyCode: string;
}

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  currencyCode: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/orders');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      const shopifyOrders = (data.orders || []).map((order: any) => {
        const items = (order.line_items || []).map((item: any) => ({
          name: item.name || item.title || 'Product',
          quantity: item.quantity || 0,
          price: parseFloat(item.price || '0'),
        }));

        const total = parseFloat(order.total_price || '0');
        const currencyCode = order.currency || 'USD';

        let status: Order['status'] = 'pending';
        if (order.cancelled_at) {
          status = 'cancelled';
        } else if (order.fulfillment_status === 'fulfilled') {
          status = 'delivered';
        } else if (order.fulfillment_status === 'partial') {
          status = 'shipped';
        } else if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') {
          status = 'processing';
        }

        return {
          id: String(order.id),
          orderNumber: order.name || `#${order.id}`,
          total,
          currencyCode,
          status,
          createdAt: order.created_at,
          items,
        };
      });

      setOrders(shopifyOrders);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: Clock,
      processing: Package,
      shipped: Package,
      delivered: CheckCircle,
      cancelled: XCircle,
    };
    const Icon = icons[status as keyof typeof icons] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  const isPiiError = error?.includes('Permisos') || error?.includes('permission') || error?.includes('PII');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600">Track and manage all product orders</p>
          </div>
        </div>
        <div className={`rounded-lg p-6 ${isPiiError ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${isPiiError ? 'text-amber-900' : 'text-red-900'}`}>
            {isPiiError ? 'Permisos de Shopify requeridos' : 'Error loading orders'}
          </h3>
          <p className={`text-sm ${isPiiError ? 'text-amber-700' : 'text-red-700'}`}>{error}</p>
          <button
            onClick={fetchOrders}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 text-sm">Track and manage all product orders</p>
        </div>
        <button
          onClick={fetchOrders}
          className="px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 min-h-[48px] font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <ShoppingBag className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{order.orderNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {order.items.map((item, index) => (
                        <span key={index}>{item.name} x{item.quantity}{index < order.items.length - 1 ? ', ' : ''}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2 text-sm text-gray-900">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span>${order.total.toFixed(2)} {order.currencyCode}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="capitalize">{order.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No orders found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-gray-400" />
                <span className="font-semibold text-gray-900">{order.orderNumber}</span>
              </div>
              <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                {getStatusIcon(order.status)}
                <span className="capitalize">{order.status}</span>
              </span>
            </div>
            <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
            <div className="text-sm text-gray-700">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between py-1">
                  <span className="truncate pr-2">{item.name} <span className="text-gray-500">x{item.quantity}</span></span>
                  <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-600">Total</span>
              <span className="font-bold text-gray-900">${order.total.toFixed(2)} {order.currencyCode}</span>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">No orders found</div>
        )}
      </div>
    </div>
  );
}
