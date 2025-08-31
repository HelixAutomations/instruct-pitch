/**
 * Stripe Context Provider
 * 
 * Provides Stripe configuration and utilities throughout the React app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useClient } from './ClientContext';

interface StripeConfig {
  publishableKey: string;
  currency: string;
}

interface StripeContextType {
  config: StripeConfig | null;
  loading: boolean;
  error: string | null;
}

const StripeContext = createContext<StripeContextType>({
  config: null,
  loading: true,
  error: null,
});

export const useStripeConfig = () => {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error('useStripeConfig must be used within a StripeProvider');
  }
  return context;
};

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  const { dealData } = useClient();
  const [config, setConfig] = useState<StripeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  // Detect V2 demo route so we can bypass legacy gating that requires dealData.Amount
  const isV2Demo = typeof window !== 'undefined' && /payment-v2-demo/.test(window.location.pathname);

  useEffect(() => {
    const loadStripeConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch Stripe configuration from backend
        const response = await fetch('/api/payments/config');
        
        // If server is still initializing, retry once after a short delay
        if (response.status === 404 || response.status === 503) {
          console.log('Payment system initializing, retrying in 3s...');
          // Don't show any special message to user - keep showing "Loading payment system..."
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const retryResponse = await fetch('/api/payments/config');
          if (!retryResponse.ok) {
            throw new Error(`Retry failed: ${retryResponse.status} ${retryResponse.statusText}`);
          }
          
          const configData: StripeConfig = await retryResponse.json();
          if (!configData.publishableKey) {
            throw new Error('Stripe publishable key not configured');
          }

          setConfig(configData);
          const stripe = loadStripe(configData.publishableKey);
          setStripePromise(stripe);
          console.log('✅ Stripe configuration loaded successfully');
          return;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to load Stripe config: ${response.statusText}`);
        }

        const configData: StripeConfig = await response.json();
        
        if (!configData.publishableKey) {
          throw new Error('Stripe publishable key not configured');
        }

        setConfig(configData);
        
        // Initialize Stripe with the publishable key
        const stripe = loadStripe(configData.publishableKey);
        setStripePromise(stripe);

        console.log('✅ Stripe configuration loaded successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load Stripe configuration';
        console.error('❌ Failed to load Stripe config:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadStripeConfig();
  }, []);

  const contextValue: StripeContextType = {
    config,
    loading,
    error,
  };

  // Show loading state
  if (loading) {
    return (
      <StripeContext.Provider value={contextValue}>
        <div className="stripe-loading">
          <p>Loading payment system...</p>
        </div>
      </StripeContext.Provider>
    );
  }

  // Show error state
  if (error || !config || !stripePromise) {
    return (
      <StripeContext.Provider value={contextValue}>
        <div className="stripe-error">
          <p>Payment system unavailable: {error || 'Configuration error'}</p>
          {children}
        </div>
      </StripeContext.Provider>
    );
  }

  // Wait for deal data to be available before initializing Stripe Elements
  // Legacy flow required dealData.Amount before rendering anything so Elements could be configured
  // For the V2 demo we intentionally allow rendering even without dealData so the new orchestrated
  // payment flow can fetch/create its own PaymentIntent. If deal data later arrives it doesn't break.
  if (!isV2Demo && (!dealData || (!dealData.Amount && dealData.Amount !== 0))) {
    return (
      <StripeContext.Provider value={contextValue}>
        <div className="stripe-loading">
          <p>Initialising payment...</p>
        </div>
      </StripeContext.Provider>
    );
  }

  // Stripe Elements configuration - only when we have deal data
  const options = {
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0066cc',
        colorBackground: '#ffffff',
        colorText: '#333333',
        colorDanger: '#dc3545',
        borderRadius: '4px',
      },
    },
    currency: config.currency.toLowerCase(),
    mode: 'payment' as const,
    // Include amount from deal data (Stripe expects amount in cents)
    amount: dealData && typeof dealData.Amount === 'number' ? Math.round(dealData.Amount * 100) : undefined,
  };

  // Skip wrapping with Elements for V2 demo (it handles its own <Elements> with clientSecret)
  if (isV2Demo) {
    return (
      <StripeContext.Provider value={contextValue}>
        {children}
      </StripeContext.Provider>
    );
  }

  return (
    <StripeContext.Provider value={contextValue}>
      <Elements stripe={stripePromise} options={options}>
        {children}
      </Elements>
    </StripeContext.Provider>
  );
};
