// Common types that will be used across the application

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

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  depositAmount: number;
  category: string;
  executionOrder: number;
}

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

export type PaymentType = 'product' | 'service_deposit' | 'service_full' | 'combined';

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