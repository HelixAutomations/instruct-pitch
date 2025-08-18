/**
 * Payment Form Component
 * 
 * Complete Stripe payment form with Elements integration
 */

import React, { useState, useEffect } from 'react';
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

  // Create PaymentIntent on component mount
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        const response = await paymentService.createPaymentIntent({
          amount,
          currency,
          instructionRef,
          metadata,
        });
        
        setClientSecret(response.clientSecret);
        setPaymentId(response.paymentId);
        
        console.log('✅ Payment intent created for form');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (amount > 0 && instructionRef) {
      createPaymentIntent();
    }
  }, [amount, currency, instructionRef, metadata, onError]);

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
      <div className="payment-form__header">
        <h3>Payment Details</h3>
        <div className="payment-amount">
          {paymentService.formatAmount(amount, currency)}
        </div>
      </div>

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
        >
          {isProcessing ? (
            <>
              <span className="spinner"></span>
              Processing...
            </>
          ) : (
            `Pay ${paymentService.formatAmount(amount, currency)}`
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
