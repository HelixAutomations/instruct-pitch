/**
 * Payment Form Component
 * 
 * Complete Stripe payment form with Elements integration
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { paymentService, PaymentStatus } from '../utils/paymentService';
import './PaymentForm.css';

interface PaymentFormProps {
  amount: number;
  currency?: string;
  instructionRef: string;
  metadata?: Record<string, any>;
  onSuccess?: (payment: PaymentStatus) => void;
  onError?: (error: string) => void;
  onStatusUpdate?: (status: PaymentStatus) => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  currency = 'gbp',
  instructionRef,
  metadata = {},
  onSuccess,
  onError,
  onStatusUpdate,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  
  // Use ref to persist across re-renders and prevent duplicate payment intent creation
  const paymentIntentCreatedRef = useRef(false);
  const currentInstructionRef = useRef<string>('');

  // Debug state changes
  useEffect(() => {
    console.log('🔍 PaymentForm state update:', {
      stripe: !!stripe,
      elements: !!elements,
      clientSecret: !!clientSecret,
      isLoading,
      isProcessing,
      error: !!error,
      instructionRef,
      amount
    });
  }, [stripe, elements, clientSecret, isLoading, isProcessing, error, instructionRef, amount]);

  // Create PaymentIntent on component mount - only once per instruction (guarding StrictMode double invoke)
  useEffect(() => {
    // Narrow dependencies deliberately: metadata & onError excluded to avoid re-trigger due to new object/function identities
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const paymentIntentKey = `payment-intent-${instructionRef}`;
    const creatingKey = `payment-intent-creating-${instructionRef}`;

    // Global (per-tab) cache in case component unmounts/remounts rapidly
    const globalCache: any = (window as any).__paymentIntents || ((window as any).__paymentIntents = {});
    const globalEntry = globalCache[instructionRef];
    if (globalEntry && globalEntry.amount === amount) {
      if (!clientSecret) {
        setClientSecret(globalEntry.clientSecret);
        setPaymentId(globalEntry.paymentId);
        console.log('♻️ Reusing global cached PaymentIntent for', instructionRef);
      }
      return;
    }

    // Reuse if already created & stored
    const existingClientSecret = sessionStorage.getItem(paymentIntentKey);
    if (existingClientSecret && !clientSecret) {
      setClientSecret(existingClientSecret);
      console.log('♻️ Reusing cached PaymentIntent (client) for', instructionRef);
      return;
    }

    // Abort if creation already in-flight or unsuitable
    // Abort if creation already in-flight or unsuitable
    if (sessionStorage.getItem(creatingKey)) { return; }
    if (paymentIntentCreatedRef.current) { return; }
    if (amount <= 0) { return; }
    if (!instructionRef) { return; }
    if (clientSecret) { return; }
  if (amount <= 0) { return; }
  if (!instructionRef) { return; }
  if (clientSecret) { return; }

    // Pre-mark to block StrictMode second invoke BEFORE async starts
    sessionStorage.setItem(creatingKey, '1');
    paymentIntentCreatedRef.current = true;
    currentInstructionRef.current = instructionRef;
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true); setError('');
        console.log('🔧 About to create payment intent with:', { amount, currency, instructionRef, metadata });
        const response = await paymentService.createPaymentIntent({ amount, currency, instructionRef, metadata });
        console.log('🔧 Payment service response:', response);
        if (cancelled) { 
          console.log('🔧 Component cancelled, but we have a valid response - proceeding with setClientSecret');
        }
        console.log('🔧 Setting clientSecret:', response.clientSecret);
        setClientSecret(response.clientSecret);
        setPaymentId(response.paymentId);
        sessionStorage.setItem(paymentIntentKey, response.clientSecret);
        globalCache[instructionRef] = { clientSecret: response.clientSecret, paymentId: response.paymentId, amount };
        console.log('✅ Created / obtained PaymentIntent', response.paymentId);
      } catch (err) {
        // Allow retry
        paymentIntentCreatedRef.current = false;
        sessionStorage.removeItem(creatingKey);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        // Always clear loading state, even if cancelled, to prevent stuck loading
        setIsLoading(false);
        sessionStorage.removeItem(creatingKey); // clear in all cases
      }
    })();

    return () => { cancelled = true; };
  }, [amount, currency, instructionRef, clientSecret]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Confirm the payment
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment-complete`,
        },
        redirect: 'if_required', // Only redirect for 3D Secure if needed
      });

      if (stripeError) {
        // Payment failed or requires additional action
        console.error('❌ Stripe payment error:', stripeError);
        setError(stripeError.message || 'Payment failed');
        if (onError) {
          onError(stripeError.message || 'Payment failed');
        }
        return;
      }

      if (paymentIntent) {
        console.log('✅ Payment confirmed with Stripe:', paymentIntent.status);
        
        // Start polling for final status (webhook will update database)
        try {
          const finalStatus = await paymentService.pollPaymentStatus(
            paymentId,
            (status) => {
              setPaymentStatus(status);
              if (onStatusUpdate) {
                onStatusUpdate(status);
              }
            }
          );
          
          setPaymentStatus(finalStatus);
          
          // Check if payment completed successfully
          if (finalStatus.paymentStatus === 'succeeded' && finalStatus.internalStatus === 'completed') {
            if (onSuccess) {
              onSuccess(finalStatus);
            }
          } else if (finalStatus.paymentStatus === 'failed' || finalStatus.internalStatus === 'failed') {
            const errorMsg = paymentService.getStatusDisplayText(finalStatus.paymentStatus, finalStatus.internalStatus);
            setError(errorMsg);
            if (onError) {
              onError(errorMsg);
            }
          }
        } catch (pollError) {
          console.error('❌ Failed to get final payment status:', pollError);
          setError('Payment status unknown - please contact support');
          if (onError) {
            onError('Payment status unknown - please contact support');
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      console.error('❌ Payment processing error:', err);
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Show loading state while creating PaymentIntent
  if (isLoading) {
    return (
      <div className="payment-form loading">
        <div className="payment-form__loading">
          <p>Initializing payment...</p>
        </div>
      </div>
    );
  }

  // Show error if PaymentIntent creation failed
  if (error && !clientSecret) {
    return (
      <div className="payment-form error">
        <div className="payment-form__error">
          <h3>Payment Unavailable</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Show payment completion status
  if (paymentStatus) {
    const severity = paymentService.getStatusSeverity(paymentStatus.paymentStatus, paymentStatus.internalStatus);
    const statusText = paymentService.getStatusDisplayText(paymentStatus.paymentStatus, paymentStatus.internalStatus);
    
    return (
      <div className={`payment-form status status--${severity}`}>
        <div className="payment-form__status">
          <h3>Payment Status</h3>
          <p className="status-text">{statusText}</p>
          <div className="payment-details">
            <p><strong>Amount:</strong> {paymentService.formatAmount(paymentStatus.amount, paymentStatus.currency)}</p>
            <p><strong>Payment ID:</strong> {paymentStatus.paymentId}</p>
            <p><strong>Instruction:</strong> {paymentStatus.instructionRef}</p>
          </div>
          {paymentStatus.paymentStatus === 'requires_action' && (
            <div className="auth-hint">
              <p>Your bank needs you to complete an additional authentication step (3D Secure). Please follow any popup or inline prompt above. If nothing appears, click the Pay button again or refresh this page.</p>
            </div>
          )}
          {severity === 'error' && (
            <button 
              type="button" 
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="payment-form">
      <form onSubmit={handleSubmit} className="payment-form__form">
        {clientSecret && (
          <div className="payment-element-container">
            <PaymentElement
              options={{
                layout: 'tabs',
                business: {
                  name: 'Helix Law',
                },
              }}
            />
          </div>
        )}

        {error && (
          <div className="payment-form__error">
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || !elements || isProcessing || !clientSecret}
          className={`payment-form__submit ${isProcessing ? 'processing' : ''}`}
          onClick={() => {
            console.log('🔍 Button state check:', {
              stripe: !!stripe,
              elements: !!elements,
              isProcessing,
              clientSecret: !!clientSecret,
              disabled: !stripe || !elements || isProcessing || !clientSecret,
              'stripe?': stripe ? 'YES' : 'NO',
              'elements?': elements ? 'YES' : 'NO', 
              'isProcessing?': isProcessing ? 'YES' : 'NO',
              'clientSecret?': clientSecret ? 'YES' : 'NO'
            });
          }}
        >
          {isProcessing ? (
            <>
              <span className="spinner"></span>
              Processing...
            </>
          ) : (
            `Complete Payment`
          )}
        </button>
      </form>

      <div className="payment-form__footer">
        <p className="security-notice">
          <span className="lock-icon">🔒</span>
          Your payment information is secure and encrypted
        </p>
      </div>
    </div>
  );
};
