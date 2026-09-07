'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface StripeCheckoutProps {
  amount: number;
  paymentType: 'booking' | 'product' | 'combined';
  paymentOption?: 'deposit' | 'full';
  items: any[];
  clientInfo: { email: string; name: string };
  appointmentId?: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

function CheckoutForm({
  amount,
  clientInfo,
  onSuccess,
  onCancel,
  clientSecret,
}: {
  amount: number;
  clientInfo: { email: string; name: string };
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      if (!stripe || !elements) {
        throw new Error('Stripe has not been initialized. Please try again.');
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: confirmError, paymentIntent: confirmedPaymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: clientInfo.name,
            email: clientInfo.email,
          },
        },
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed. Please check your card details and try again.');
        setIsProcessing(false);
        return;
      }

      if (confirmedPaymentIntent?.status === 'succeeded') {
        onSuccess(confirmedPaymentIntent.id);
      } else if (confirmedPaymentIntent?.status === 'requires_action' || confirmedPaymentIntent?.status === 'requires_confirmation') {
        // Stripe handles 3D Secure modal
      } else {
        setError('Payment could not be completed. Please try again.');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Payment submission error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <Lock className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Secure Payment</h2>
          <p className="text-xs text-gray-600">Powered by Stripe — PCI compliant</p>
        </div>
      </div>

      {/* Card Element */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Card Information
        </label>
        <div className="border border-gray-300 rounded-xl p-4 bg-white min-h-[52px]">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': { color: '#aab7c4' },
                },
                invalid: { color: '#9e2146' },
              },
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Buttons - Mobile optimized */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 px-4 py-3.5 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all duration-200 min-h-[52px]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-[2] px-4 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all duration-200 min-h-[56px] shadow-sm"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              <span>Pay ${amount.toFixed(2)}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function StripeCheckout({
  amount,
  paymentType,
  paymentOption,
  items,
  clientInfo,
  appointmentId,
  onSuccess,
  onCancel,
}: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: paymentType,
            paymentOption: paymentOption || 'deposit',
            amount,
            items,
            clientInfo,
            appointmentId,
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.details || data.error || 'Failed to initialize payment');
        }

        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error('No client secret returned from server');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize payment');
        console.error('Payment intent creation error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [amount, paymentType, paymentOption, items, clientInfo, appointmentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error || 'Failed to initialize payment'}</span>
        </div>
        <button
          onClick={onCancel}
          className="mt-4 w-full px-4 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#4A7C59',
        colorBackground: '#ffffff',
        colorText: '#1a1a1a',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm
        amount={amount}
        clientInfo={clientInfo}
        onSuccess={onSuccess}
        onCancel={onCancel}
        clientSecret={clientSecret}
      />
    </Elements>
  );
}
