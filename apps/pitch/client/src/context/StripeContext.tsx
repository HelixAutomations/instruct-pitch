/**
 * Stripe Context Provider
 * 
 * Provides Stripe configuration and utilities throughout the React app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

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

export const useStripe = () => {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
};

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<StripeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  useEffect(() => {
    const loadStripeConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch Stripe configuration from backend
        const response = await fetch('/api/payments/config');
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

  // Stripe Elements configuration
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
    mode: 'setup' as const, // Use setup mode to avoid requiring amount upfront
  };

  return (
    <StripeContext.Provider value={contextValue}>
      <Elements stripe={stripePromise} options={options}>
        {children}
      </Elements>
    </StripeContext.Provider>
  );
};
