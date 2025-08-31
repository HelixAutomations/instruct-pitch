/**
 * PaymentFormV2 Component - Simplified Version 4
 * 
 * Streamlined payment form with single card input field
 * Features: Clean interface, 3D Secure, essential trust indicators
 */

import React, { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { FiLock, FiAlertCircle, FiShield, FiCheckCircle } from 'react-icons/fi';
import { paymentTelemetry } from '../../utils/paymentTelemetry';
import { PaymentErrorHandler } from '../../utils/paymentErrorHandler';

interface PaymentFormV2Props {
  clientSecret: string;
  amount: number;
  currency: string;
  instructionRef: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onProcessingChange?: (processing: boolean) => void;
}

export const PaymentFormV2: React.FC<PaymentFormV2Props> = ({
  clientSecret,
  amount,
  currency,
  instructionRef,
  onSuccess,
  onError,
  onProcessingChange
}) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentReady, setPaymentReady] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  // Card element options for clean, simplified styling
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        color: '#2d3748',
        lineHeight: '24px',
        '::placeholder': {
          color: '#a0aec0',
        },
        padding: '12px',
      },
      invalid: {
        color: '#e53e3e',
        iconColor: '#e53e3e'
      },
      complete: {
        color: '#059669',
      }
    },
    hidePostalCode: false,
  };

  // Track component mount and form readiness
  useEffect(() => {
    paymentTelemetry.trackEvent({
      event: 'payment_form_loaded',
      instructionRef,
      amount,
      currency
    });
  }, [instructionRef, amount, currency]);

  // Update parent processing state
  useEffect(() => {
    onProcessingChange?.(isProcessing);
  }, [isProcessing, onProcessingChange]);

  const formatAmount = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatter.format(amount);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      const errorMsg = 'Payment system not ready. Please refresh and try again.';
      setErrorMessage(errorMsg);
      paymentTelemetry.trackError({
        error: 'Payment form not ready',
        severity: 'high',
        context: { stripe: !!stripe, elements: !!elements, clientSecret: !!clientSecret }
      });
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setErrorMessage('Card element not found');
      return;
    }

    // Track payment attempt start
    const startTime = Date.now();
    setIsProcessing(true);
    setErrorMessage('');

    paymentTelemetry.trackPaymentAttempt(amount, currency, instructionRef);

    try {
      // Confirm payment with CardElement - simpler approach
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            // Basic billing details - user can add more if needed
            name: 'Payment on Account of Costs',
          }
        }
      });

      const duration = Date.now() - startTime;

      if (error) {
        console.error('❌ Payment confirmation error:', error);
        
        // Use centralized error handling
        const processedError = PaymentErrorHandler.handleError(error, {
          instructionRef,
          amount,
          currency,
          duration
        });
        
        setErrorMessage(processedError.userMessage);
        
        // Track specific error types
        if (error.type === 'card_error' && error.code === 'requires_action') {
          paymentTelemetry.track3DSecure('initiated', '');
        }
        
        paymentTelemetry.trackPaymentFailure(processedError.message, amount, currency, instructionRef);
        onError(processedError.userMessage);

      } else if (paymentIntent) {
        console.log('✅ Payment confirmed:', paymentIntent.id, 'Status:', paymentIntent.status);
        
        if (paymentIntent.status === 'succeeded') {
          paymentTelemetry.trackPaymentSuccess(paymentIntent.id, amount, currency, instructionRef, duration);
          paymentTelemetry.track3DSecure('completed', paymentIntent.id);
          onSuccess(paymentIntent.id);
        } else if (paymentIntent.status === 'requires_action') {
          // This should be handled automatically by Stripe
          setErrorMessage('Additional authentication required. Please follow the prompts.');
          paymentTelemetry.track3DSecure('initiated', paymentIntent.id);
        } else if (paymentIntent.status === 'processing') {
          // Payment is being processed, will be updated via webhook
          paymentTelemetry.trackEvent({
            event: 'payment_processing',
            paymentIntentId: paymentIntent.id,
            instructionRef,
            amount,
            currency,
            duration
          });
          onSuccess(paymentIntent.id);
        } else {
          const errorMsg = 'Payment could not be completed. Please try again.';
          setErrorMessage(errorMsg);
          paymentTelemetry.trackPaymentFailure('Unexpected payment status: ' + paymentIntent.status, amount, currency, instructionRef);
          onError('Payment status: ' + paymentIntent.status);
        }
      }
    } catch (error: any) {
      console.error('❌ Payment processing error:', error);
      
      const processedError = PaymentErrorHandler.handleError(error, {
        instructionRef,
        amount,
        currency,
        duration: Date.now() - startTime
      });
      
      setErrorMessage(processedError.userMessage);
      onError(processedError.userMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardElementChange = (event: any) => {
    setCardComplete(event.complete);
    setPaymentReady(event.complete);
    
    // Clear errors when user is typing
    if (errorMessage && event.complete !== undefined) {
      setErrorMessage('');
    }

    // Track form completion progress
    if (event.complete && !paymentReady) {
      paymentTelemetry.trackUserInteraction('payment_form_completed', {
        instructionRef,
        formType: 'card_element'
      });
    }
  };

  return (
    <div className="payment-form-v2">
      <form onSubmit={handleSubmit} className="payment-form">
        
        {/* Trust Header */}
        <div className="payment-header">
          <div className="payment-header-icon">
            <FiShield className="trust-icon" />
          </div>
          <div className="payment-header-content">
            <h3>🔐 Secure Payment</h3>
            <p>✨ Simplified payment form - Your card details are protected</p>
          </div>
          <div className="security-badges">
            <FiLock className="security-icon" />
          </div>
        </div>

        {/* Card Input Element */}
        <div className="card-input-container">
          <label htmlFor="card-element" className="card-label">
            Card Details
          </label>
          <div className="card-element-wrapper">
            <CardElement
              id="card-element"
              options={cardElementOptions}
              onChange={handleCardElementChange}
            />
          </div>
        </div>

        {/* Error Display */}
        {errorMessage && (
          <div className="payment-error">
            <FiAlertCircle className="error-icon" />
            <span className="error-message">{errorMessage}</span>
          </div>
        )}

        {/* Payment Button */}
        <button
          type="submit"
          disabled={!stripe || !paymentReady || isProcessing || !cardComplete}
          className={`payment-button ${isProcessing ? 'processing' : ''} ${cardComplete ? 'ready' : 'pending'}`}
        >
          {isProcessing ? (
            <div className="processing-content">
              <div className="payment-spinner" />
              <span>Processing Payment...</span>
            </div>
          ) : (
            <div className="payment-content">
              <FiLock className="button-icon" />
              <span>Pay {formatAmount(amount, currency)}</span>
            </div>
          )}
        </button>

        {/* Security Footer */}
        <div className="payment-security-footer">
          <div className="security-item">
            <FiShield className="security-icon" />
            <span>256-bit SSL encryption</span>
          </div>
          <div className="security-item">
            <FiCheckCircle className="security-icon" />
            <span>PCI DSS compliant</span>
          </div>
          <div className="security-item">
            <FiLock className="security-icon" />
            <span>3D Secure supported</span>
          </div>
        </div>

        {/* Payment Reference */}
        <div className="payment-reference">
          <small>Reference: {instructionRef}</small>
        </div>
      </form>

      <style>{`
        .payment-form-v2 {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }

        .payment-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .payment-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          flex-wrap: wrap;
        }

        .payment-header-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 8px;
          color: white;
        }

        .trust-icon {
          font-size: 20px;
        }

        .payment-header-content h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #1e293b;
          font-weight: 600;
        }

        .payment-header-content p {
          margin: 0;
          font-size: 0.875rem;
          color: #64748b;
        }

        .security-badges {
          margin-left: auto;
        }

        .security-icon {
          font-size: 24px;
          color: #059669;
        }

        .payment-element-container {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .payment-element-wrapper {
          padding: 1.5rem;
        }

        .card-input-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .card-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .card-element-wrapper {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
          transition: border-color 150ms ease;
        }

        .card-element-wrapper:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .payment-error {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #dc2626;
        }

        .error-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .error-message {
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .payment-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: clamp(6px, 2vw, 10px);
          padding: clamp(14px, 4vw, 18px) clamp(20px, 6vw, 40px);
          border: none;
          border-radius: clamp(8px, 2.5vw, 14px);
          font-size: clamp(0.875rem, 3.5vw, 1rem);
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 150ms ease;
          min-height: clamp(48px, 12vw, 56px);
          touch-action: manipulation;
          width: 100%;
          -webkit-tap-highlight-color: transparent;
          background: #0D2F60;
          color: #FFFFFF;
          font-family: 'Raleway', sans-serif;
        }

        .payment-button:hover:not(:disabled) {
          background: #061733;
          transform: translateY(-1px);
        }

        .payment-button:active {
          transform: translateY(0);
        }

        .payment-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .payment-button.processing {
          background: #0D2F60;
          opacity: 0.8;
        }

        .payment-button.ready {
          background: #059669;
        }

        .payment-button.ready:hover:not(:disabled) {
          background: #047857;
          transform: translateY(-1px);
        }

        .processing-content,
        .payment-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .payment-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .button-icon {
          font-size: 18px;
        }

        .payment-security-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-size: 0.75rem;
          color: #64748b;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .security-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .security-item .security-icon {
          font-size: 14px;
          color: #059669;
        }

        .payment-reference {
          text-align: center;
          padding: 0.5rem;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        @media (max-width: 480px) {
          .payment-security-footer {
            flex-direction: column;
            justify-content: center;
            text-align: center;
          }

          .payment-header {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }

          .card-element-wrapper {
            padding: 0.75rem;
          }

          .card-label {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};