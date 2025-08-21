/**
 * PaymentFlowV2 Component
 * 
 * Complete payment flow orchestrating all V2 components
 * Implements the approved trust-first, feature-flagged payment UX
 */

import React, { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useFeatureFlag } from '../../utils/featureFlags';
import { PaymentLayout } from './PaymentLayoutV2';
import { PriceSummaryCard } from './PriceSummaryCardV2';
import { PreflightPane } from './PreflightPaneV2';
import { TrustStrip } from './TrustStrip';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentFlowV2Props {
  amount: number;
  currency: string;
  instructionRef: string;
  legalService: string;
  description: string;
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

type PaymentStep = 'preflight' | 'payment' | 'processing' | 'result';

export const PaymentFlowV2: React.FC<PaymentFlowV2Props> = ({
  amount,
  currency,
  instructionRef,
  legalService,
  description,
  onSuccess,
  onError,
  onCancel
}) => {
  const isV2Enabled = useFeatureFlag('PAYMENTS_UX_V2');
  const [currentStep, setCurrentStep] = useState<PaymentStep>('preflight');
  const [clientSecret, setClientSecret] = useState<string>('');

  // If V2 is not enabled, fallback to legacy component
  if (!isV2Enabled) {
    // This would render the legacy payment component
    return <div>Legacy payment flow would render here</div>;
  }

  const handlePreflightComplete = async () => {
    try {
      // Create payment intent
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          instructionRef,
          metadata: {
            legalService,
            description,
            source: 'payments_v2'
          }
        }),
      });

      const data = await response.json();
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setCurrentStep('payment');
      } else {
        onError?.('Failed to initialize payment session');
      }
    } catch (error) {
      console.error('Payment intent creation failed:', error);
      onError?.('Failed to initialize payment session');
    }
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setCurrentStep('result');
    onSuccess?.(paymentIntentId);
  };

  const handlePaymentError = (error: string) => {
    onError?.(error);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'preflight':
        return (
          <PreflightPane 
            onComplete={handlePreflightComplete}
            duration={1200}
            showProgress={true}
          />
        );

      case 'payment':
        return (
          <div className="payment-step">
            <PriceSummaryCard
              amount={amount}
              currency={currency}
              description={description}
              instructionRef={instructionRef}
              legalService={legalService}
              vatIncluded={true}
            />
            
            {clientSecret && (
              <Elements 
                stripe={stripePromise} 
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#1e293b',
                      colorBackground: '#ffffff',
                      colorText: '#1e293b',
                      colorDanger: '#dc2626',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      spacingUnit: '4px',
                      borderRadius: '8px',
                    },
                    rules: {
                      '.Input': {
                        border: '1px solid #d1d5db',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                      },
                      '.Input:focus': {
                        border: '1px solid #3b82f6',
                        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                      },
                    },
                  },
                }}
              >
                <div className="payment-form-placeholder">
                  {/* Enhanced PaymentForm component would go here */}
                  <div className="form-placeholder">
                    <h3>Payment Form</h3>
                    <p>Enhanced Stripe Elements form will be implemented here</p>
                    <p>Features: 3D Secure, automatic payment methods, Helix theming</p>
                  </div>
                </div>
              </Elements>
            )}
          </div>
        );

      case 'processing':
        return (
          <div className="processing-step">
            <div className="processing-content">
              <div className="spinner"></div>
              <h3>Processing your payment...</h3>
              <p>Please do not close this window</p>
            </div>
          </div>
        );

      case 'result':
        return (
          <div className="result-step">
            <div className="success-content">
              <h3>Payment Successful</h3>
              <p>Your legal service payment has been processed successfully.</p>
              <p>Reference: {instructionRef}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PaymentLayout 
      title="Secure Legal Service Payment"
      showTrustElements={true}
    >
      <div className="payment-flow-v2">
        {renderCurrentStep()}
      </div>
      
      {/* Trust strip is always visible */}
      <TrustStrip 
        variant="default"
        showSupportContacts={true}
        showComplianceLinks={true}
        showTrustBadges={true}
      />

      <style jsx>{`
        .payment-flow-v2 {
          min-height: 400px;
        }

        .payment-step {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-placeholder {
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          color: #64748b;
        }

        .form-placeholder h3 {
          margin: 0 0 1rem 0;
          color: #374151;
        }

        .form-placeholder p {
          margin: 0.5rem 0;
        }

        .processing-step, .result-step {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
        }

        .processing-content, .success-content {
          text-align: center;
          max-width: 400px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .processing-content h3, .success-content h3 {
          margin: 0 0 1rem 0;
          color: #1e293b;
        }

        .processing-content p, .success-content p {
          color: #64748b;
          margin: 0.5rem 0;
        }
      `}</style>
    </PaymentLayout>
  );
};