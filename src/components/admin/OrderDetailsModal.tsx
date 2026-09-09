'use client';

import { useEffect, useState } from 'react';
import { X, ShoppingBag, Truck, ExternalLink, Package, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';

interface ShopifyOrder {
  id: string;
  name: string;
  createdAt: string;
  cancelledAt: string | null;
  closedAt: string | null;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPriceSet: {
    shopMoney: { amount: string; currencyCode: string };
  };
  subtotalPriceSet: {
    shopMoney: { amount: string; currencyCode: string };
  };
  totalTaxSet: {
    shopMoney: { amount: string; currencyCode: string };
  };
  totalShippingPriceSet: {
    shopMoney: { amount: string; currencyCode: string };
  };
  lineItems: {
    edges: Array<{
      node: {
        id: string;
        name: string;
        quantity: number;
        originalTotalSet: {
          shopMoney: { amount: string; currencyCode: string };
        };
        variant?: { id: string; sku: string };
      };
    }>;
  };
  fulfillments: Array<{
    id: string;
    status: string;
    trackingInfo: Array<{ number: string; company: string }>;
  }>;
}

interface OrderDetailsModalProps {
  orderId: string;
  onClose: () => void;
}

/** Extracts the numeric id from a Shopify GID like `gid://shopify/Order/123`. */
function extractOrderId(gid: string): string | null {
  const match = gid.match(/Order\/(\d+)/);
  return match ? match[1] : null;
}

/** Builds a deep link to the order in the Shopify admin, or '#' if unresolvable. */
function getShopifyAdminUrl(orderId: string): string {
  const numericId = extractOrderId(orderId);
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN;
  if (!numericId || !domain) return '#';
  return `https://${domain}/admin/orders/${numericId}`;
}

/**
 * Admin modal showing a Shopify order's details: status badges, totals,
 * line items, fulfillments and fulfillment actions (fulfill / cancel).
 *
 * Customer PII (name, address) is intentionally not displayed — Shopify
 * requires approved protected-data permissions for those fields; the modal
 * surfaces a notice when the API reports `PII_REQUIRED`.
 *
 * @param orderId - Shopify order GID.
 * @param onClose - closes the modal.
 */
export function OrderDetailsModal({ orderId, onClose }: OrderDetailsModalProps) {
  const [order, setOrder] = useState<ShopifyOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingFulfillment, setUpdatingFulfillment] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/admin/orders?id=${encodeURIComponent(orderId)}`);
        const contentType = response.headers.get('content-type') || '';
        if (!response.ok || !contentType.includes('application/json')) {
          const text = contentType.includes('text/html') ? await response.text() : await response.text();
          throw new Error(text || `Error ${response.status}: Failed to fetch order`);
        }
        const data = await response.json();
        if (!data.order) {
          if (response.status === 403 || data.code === 'PII_REQUIRED') {
            setError('Permisos de cliente requeridos en Shopify. El admin de Shopify debe aprobar el acceso a datos protegidos.');
            return;
          }
          throw new Error(data.error || 'Order not found');
        }
        setOrder(data.order);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch order';
        if (message.includes('customer') || message.includes('Customer') || message.includes('Permisos')) {
          setError('Permisos de cliente requeridos en Shopify. El admin de Shopify debe aprobar el acceso a datos protegidos.');
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  /** Calls the admin fulfillment endpoint ('fulfill' | 'cancel') and refreshes the order. */
  const handleFulfillmentAction = async (action: 'fulfill' | 'cancel') => {
    setUpdatingFulfillment(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/fulfillment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const text = await response.text();
        let message = 'Fulfillment action failed';
        try {
          const json = JSON.parse(text);
          message = json.error || message;
        } catch {
          // Not JSON, keep default
        }
        throw new Error(message);
      }
      const data = await response.json();
      setOrder(data.order);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fulfillment action failed');
    } finally {
      setUpdatingFulfillment(false);
    }
  };

  const formatMoney = (amount: string, currency: string) => {
    return `$${parseFloat(amount).toFixed(2)} ${currency}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    const isPiiError = error?.includes('Permisos de cliente');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md text-center">
          {isPiiError ? (
            <>
              <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Permisos de cliente requeridos en Shopify</h3>
              <p className="text-gray-600">El administrador de Shopify debe aprobar los permisos de acceso a datos protegidos (PII) para ver la información completa de la orden.</p>
            </>
          ) : (
            <p className="text-red-600">{error || 'Order not found'}</p>
          )}
          <button onClick={onClose} className="mt-6 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
        </div>
      </div>
    );
  }

  const lineItems = order.lineItems?.edges?.map((edge) => edge.node) || [];
  const shopifyUrl = getShopifyAdminUrl(order.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <ShoppingBag className="w-6 h-6 text-green-600" />
            <span>{order.name}</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              order.displayFinancialStatus === 'PAID' ? 'bg-green-100 text-green-700' :
              order.displayFinancialStatus === 'REFUNDED' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {order.displayFinancialStatus || 'Unknown Payment'}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              order.displayFulfillmentStatus === 'FULFILLED' ? 'bg-green-100 text-green-700' :
              order.displayFulfillmentStatus === 'UNFULFILLED' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {order.displayFulfillmentStatus || 'Unknown Fulfillment'}
            </span>
            {order.cancelledAt && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                Cancelled
              </span>
            )}
          </div>

          {/* Customer info hidden until Shopify PII permissions are approved */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Información del cliente oculta</p>
              <p className="text-xs text-amber-700 mt-1">
                Los datos del cliente y dirección de envío requieren permisos PII aprobados en Shopify. Hasta entonces, el modal muestra solo productos, totales y estados.
              </p>
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Subtotal</p>
              <p className="font-semibold text-gray-900">{formatMoney(order.subtotalPriceSet.shopMoney.amount, order.subtotalPriceSet.shopMoney.currencyCode)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Shipping</p>
              <p className="font-semibold text-gray-900">{formatMoney(order.totalShippingPriceSet.shopMoney.amount, order.totalShippingPriceSet.shopMoney.currencyCode)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Tax</p>
              <p className="font-semibold text-gray-900">{formatMoney(order.totalTaxSet.shopMoney.amount, order.totalTaxSet.shopMoney.currencyCode)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Total</p>
              <p className="font-semibold text-gray-900 text-green-700">{formatMoney(order.totalPriceSet.shopMoney.amount, order.totalPriceSet.shopMoney.currencyCode)}</p>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>Products</span>
            </h3>
            <div className="space-y-2">
              {lineItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}{item.variant?.sku ? ` · SKU: ${item.variant.sku}` : ''}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatMoney(item.originalTotalSet.shopMoney.amount, item.originalTotalSet.shopMoney.currencyCode)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Fulfillments */}
          {order.fulfillments && order.fulfillments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                <Truck className="w-4 h-4" />
                <span>Fulfillments</span>
              </h3>
              <div className="space-y-2">
                {order.fulfillments.map((fulfillment) => (
                  <div key={fulfillment.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 capitalize">{fulfillment.status.toLowerCase()}</p>
                    {fulfillment.trackingInfo?.map((info, index) => (
                      <p key={index} className="text-xs text-gray-500">
                        {info.company} · {info.number}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
            {order.displayFulfillmentStatus === 'UNFULFILLED' && !order.cancelledAt && (
              <button
                onClick={() => handleFulfillmentAction('fulfill')}
                disabled={updatingFulfillment}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Mark as Fulfilled</span>
              </button>
            )}
            {order.displayFulfillmentStatus === 'FULFILLED' && !order.cancelledAt && (
              <button
                onClick={() => handleFulfillmentAction('cancel')}
                disabled={updatingFulfillment}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Cancel Fulfillment</span>
              </button>
            )}
            <a
              href={shopifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View in Shopify</span>
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
