'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  variantId: string;
  title: string;
  handle: string;
  price: number;
  quantity: number;
  image: string;
  productType: string;
}

export interface ActiveBooking {
  id: string;
  serviceName: string;
  locationId: string;
  locationName: string;
  date: string;
  startTime: string;
  guestCount: number;
  depositAmount: number;
  totalAmount: number;
  expiresAt: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: any, variantId: string, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeBooking: ActiveBooking | null;
  setActiveBooking: (booking: ActiveBooking | null) => void;
  removeActiveBooking: () => void;
}

const CART_STORAGE_KEY = 'curlsarefun-cart';
const BOOKING_STORAGE_KEY = 'curlsarefun-active-booking';

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [activeBooking, setActiveBookingState] = useState<ActiveBooking | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart and active booking from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }

      const savedBooking = localStorage.getItem(BOOKING_STORAGE_KEY);
      if (savedBooking) {
        const parsedBooking: ActiveBooking = JSON.parse(savedBooking);
        // Ignore expired bookings
        if (new Date(parsedBooking.expiresAt) > new Date()) {
          setActiveBookingState(parsedBooking);
        } else {
          localStorage.removeItem(BOOKING_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to parse saved cart or booking:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoaded]);

  // Save active booking to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      if (activeBooking) {
        localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(activeBooking));
      } else {
        localStorage.removeItem(BOOKING_STORAGE_KEY);
      }
    }
  }, [activeBooking, isLoaded]);

  const addItem = (product: any, variantId: string, quantity: number = 1) => {
    const variant = product.variants?.edges?.find((v: any) => v.node.id === variantId);
    if (!variant) return;

    const image = product.images?.edges?.[0]?.node?.url || '';
    const price = parseFloat(variant.node.price.amount);

    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.variantId === variantId);
      
      if (existingItem) {
        return prevItems.map(item =>
          item.variantId === variantId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [
        ...prevItems,
        {
          id: product.id,
          variantId,
          title: product.title,
          handle: product.handle,
          price,
          quantity,
          image,
          productType: product.productType,
        },
      ];
    });

    setIsOpen(true);
  };

  const removeItem = (variantId: string) => {
    setItems(prevItems => prevItems.filter(item => item.variantId !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variantId);
      return;
    }

    setItems(prevItems =>
      prevItems.map(item =>
        item.variantId === variantId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const setActiveBooking = (booking: ActiveBooking | null) => {
    setActiveBookingState(booking);
  };

  const removeActiveBooking = () => {
    setActiveBookingState(null);
  };

  const cartTotal =
    items.reduce((total, item) => total + item.price * item.quantity, 0) +
    (activeBooking ? activeBooking.depositAmount : 0);

  const cartCount =
    items.reduce((count, item) => count + item.quantity, 0) +
    (activeBooking ? 1 : 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        isOpen,
        setIsOpen,
        activeBooking,
        setActiveBooking,
        removeActiveBooking,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
