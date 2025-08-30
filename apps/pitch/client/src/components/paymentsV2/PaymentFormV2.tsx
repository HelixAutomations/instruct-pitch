/**
 * PaymentFormV2 Component
 * 
 * Enhanced payment form with full Stripe Elements v2 integration
 * Features: 3D Secure, automatic payment methods, Helix theming, trust indicators
 */

import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
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
  const [formValid, setFormValid] = useState(false);

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

    // Track payment attempt start
    const startTime = Date.now();
    setIsProcessing(true);
    setErrorMessage('');

    paymentTelemetry.trackPaymentAttempt(amount, currency, instructionRef);

    try {
      // Confirm payment with 3D Secure support
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-result`,
          payment_method_data: {
            billing_details: {
              // Billing details are handled automatically by PaymentElement
            }
          }
        },
        redirect: 'if_required' // Handle 3D Secure inline when possible
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
          // This should be handled automatically by Stripe Elements
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

  const handlePaymentElementChange = (event: any) => {
    setFormValid(event.complete);
    setPaymentReady(event.complete);
    
    // Clear errors when user is typing
    if (errorMessage && event.complete !== undefined) {
      setErrorMessage('');
    }

    // Track form completion progress
    if (event.complete && !paymentReady) {
      paymentTelemetry.trackUserInteraction('payment_form_completed', {
        instructionRef,
        formType: 'stripe_elements'
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
            <h3>🔐 Ultra-Secure Payment Gateway</h3>
            <p>✨ Backend AI Assistant has modified this form - Your payment is protected by industry-leading security</p>
          </div>
          <div className="security-badges">
            <FiLock className="security-icon" />
          </div>
        </div>

        {/* Stripe Payment Element */}
        <div className="payment-element-container">
          <div className="payment-element-wrapper">
            <PaymentElement
              options={{
                layout: {
                  type: 'tabs',
                  defaultCollapsed: false,
                  radios: false,
                  spacedAccordionItems: true
                },
                paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
                fields: {
                  billingDetails: {
                    name: 'auto',
                    email: 'auto',
                    phone: 'auto',
                    address: {
                      country: 'auto',
                      line1: 'auto',
                      line2: 'auto',
                      city: 'auto',
                      state: 'auto',
                      postalCode: 'auto'
                    }
                  }
                },
                terms: {
                  card: 'auto',
                  applePay: 'auto',
                  googlePay: 'auto'
                }
              }}
              onChange={handlePaymentElementChange}
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
          disabled={!stripe || !paymentReady || isProcessing || !formValid}
          className={`payment-button ${isProcessing ? 'processing' : ''} ${formValid ? 'ready' : 'pending'}`}
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

          .payment-element-wrapper {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};