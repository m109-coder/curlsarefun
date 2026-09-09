// Common types that will be used across the application

/** A physical salon location with its IANA timezone and display hours. */
export interface SalonLocation {
  id: string;
  name: string;
  timezone: string;
  address: string;
  phone: string;
  email: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  businessHours: {
    [key: string]: {
      closed: boolean;
      shifts: { open: string; close: string }[];
    };
  };
  services: Service[];
}

/** A bookable service. `executionOrder` defines in-chair order when several services are combined in one appointment. */
export interface Service {
  id: string;
  name: string;
  description: string;
  /** Duration in minutes per guest (multiply by `guestCount` at booking). */
  duration: number;
  price: number;
  depositAmount: number;
  category: string;
  executionOrder: number;
}

/** A booking. `startTime`/`endTime` are `"HH:mm"` strings in `timezone` (salon-local), not UTC. */
export interface Appointment {
  id: string;
  locationId: string;
  serviceIds: string[];
  services: Service[];
  clientId: string;
  date: Date;
  startTime: string;
  endTime: string;
  timezone: string;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
  depositPaid: boolean;
  totalAmount: number;
  notes?: string;
}

/** Subset of the Storefront API product shape used by the storefront UI. */
export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  productType: string;
  vendor: string;
  tags: string[];
  availableForSale: boolean;
  images: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText: string | null;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: {
          amount: string;
          currencyCode: string;
        };
        availableForSale: boolean;
      };
    }>;
  };
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
}

/** What a checkout charge covers: products only, a booking deposit/full payment, or a mixed cart. */
export type PaymentType = 'product' | 'service_deposit' | 'service_full' | 'combined';

/** A single payable unit passed to the checkout/payment intent creation. */
export interface PaymentItem {
  id: string;
  type: PaymentType;
  name: string;
  description: string;
  amount: number;
  quantity: number;
  metadata: {
    productId?: string;
    variantId?: string;
    serviceId?: string;
    appointmentId?: string;
    locationId?: string;
  };
}