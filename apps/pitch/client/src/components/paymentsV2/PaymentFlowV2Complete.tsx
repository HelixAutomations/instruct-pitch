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
import { PaymentFormV2 } from './PaymentFormV2';
import { PaymentResultV2 } from './PaymentResultV2';
import { paymentTelemetry } from '../../utils/paymentTelemetry';

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

type PaymentStep = 'preflight' | 'payment' | 'processing' | 'success' | 'failed' | 'requires_action';

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
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [flowStartTime, setFlowStartTime] = useState<number>(Date.now());

  // Track flow initialization
  useEffect(() => {
    paymentTelemetry.trackEvent({
      event: 'payment_flow_started',
      instructionRef,
      amount,
      currency,
      metadata: { legalService, source: 'payments_v2' }
    });
    
    setFlowStartTime(Date.now());
  }, [instructionRef, amount, currency, legalService]);

  // If V2 is not enabled, fallback to legacy component
  if (!isV2Enabled) {
    // This would render the legacy payment component
    return <div>Legacy payment flow would render here</div>;
  }

  const handlePreflightComplete = async () => {
    const preflightStartTime = Date.now();
    
    try {
      paymentTelemetry.trackEvent({
        event: 'preflight_completed',
        instructionRef,
        amount,
        currency
      });

      // Create payment intent - updated to match backend endpoint
      const response = await fetch('/api/payments/create-payment-intent', {
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
        setPaymentIntentId(data.paymentId);
        setCurrentStep('payment');
        
        paymentTelemetry.trackEvent({
          event: 'payment_intent_created',
          paymentIntentId: data.paymentId,
          instructionRef,
          amount,
          currency,
          duration: Date.now() - preflightStartTime
        });
      } else {
        setErrorMessage('Failed to initialize payment session');
        setCurrentStep('failed');
        
        paymentTelemetry.trackEvent({
          event: 'payment_intent_failed',
          instructionRef,
          amount,
          currency,
          error: 'No client secret received'
        });
        
        onError?.('Failed to initialize payment session');
      }
    } catch (error: any) {
      console.error('Payment intent creation failed:', error);
      setErrorMessage('Failed to initialize payment session');
      setCurrentStep('failed');
      
      paymentTelemetry.trackEvent({
        event: 'payment_intent_failed',
        instructionRef,
        amount,
        currency,
        error: error.message,
        duration: Date.now() - preflightStartTime
      });
      
      onError?.('Failed to initialize payment session');
    }
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setPaymentIntentId(paymentIntentId);
    setCurrentStep('success');
    onSuccess?.(paymentIntentId);
  };

  const handlePaymentError = (error: string) => {
    setErrorMessage(error);
    setCurrentStep('failed');
    onError?.(error);
  };

  const handlePaymentProcessing = (processing: boolean) => {
    if (processing) {
      setCurrentStep('processing');
    }
  };

  const handleRetryPayment = () => {
    setErrorMessage('');
    setCurrentStep('preflight');
  };

  const handleContinue = () => {
    // Track completion and flow duration
    paymentTelemetry.trackEvent({
      event: 'payment_flow_completed',
      paymentIntentId,
      instructionRef,
      amount,
      currency,
      duration: Date.now() - flowStartTime
    });
    
    // This would typically navigate to next page or close modal
    console.log('Continue after successful payment');
  };

  const handleDownloadReceipt = () => {
    paymentTelemetry.trackUserInteraction('receipt_download', {
      paymentIntentId,
      instructionRef
    });
    
    // This would trigger receipt download
    console.log('Download receipt for payment:', paymentIntentId);
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
                <PaymentFormV2
                  clientSecret={clientSecret}
                  amount={amount}
                  currency={currency}
                  instructionRef={instructionRef}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onProcessingChange={handlePaymentProcessing}
                />
              </Elements>
            )}
          </div>
        );

      case 'processing':
        return (
          <PaymentResultV2
            status="processing"
            amount={amount}
            currency={currency}
            instructionRef={instructionRef}
            legalService={legalService}
          />
        );

      case 'success':
        return (
          <PaymentResultV2
            status="success"
            paymentIntentId={paymentIntentId}
            amount={amount}
            currency={currency}
            instructionRef={instructionRef}
            legalService={legalService}
            onContinue={handleContinue}
            onDownloadReceipt={handleDownloadReceipt}
          />
        );

      case 'failed':
        return (
          <PaymentResultV2
            status="failed"
            amount={amount}
            currency={currency}
            instructionRef={instructionRef}
            legalService={legalService}
            errorMessage={errorMessage}
            onRetry={handleRetryPayment}
          />
        );

      case 'requires_action':
        return (
          <PaymentResultV2
            status="requires_action"
            paymentIntentId={paymentIntentId}
            amount={amount}
            currency={currency}
            instructionRef={instructionRef}
            legalService={legalService}
          />
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
      `}</style>
    </PaymentLayout>
  );
};