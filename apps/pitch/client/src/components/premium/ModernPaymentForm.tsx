import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { FiLock, FiCreditCard, FiAlertCircle, FiShield } from 'react-icons/fi';
import { paymentService } from '../../utils/paymentService';

interface ModernPaymentFormProps {
  amount: number;
  currency: string;
  instructionRef: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onProcessingChange: (processing: boolean) => void;
}

const ModernPaymentForm: React.FC<ModernPaymentFormProps> = ({
  amount,
  currency,
  instructionRef,
  onSuccess,
  onError,
  onProcessingChange
}) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentMethodSelected, setPaymentMethodSelected] = useState(false);

  // Create payment intent on component mount
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        console.log('🔧 Creating payment intent for modern form:', { amount, currency, instructionRef });
        
        const response = await paymentService.createPaymentIntent({
          amount,
          currency,
          instructionRef,
          metadata: {
            source: 'premium_checkout',
            instructionRef,
            amount: amount.toString()
          }
        });
        
        if (response.clientSecret) {
          setClientSecret(response.clientSecret);
          console.log('✅ Modern payment form - client secret set:', response.paymentId);
        } else {
          throw new Error('No client secret received');
        }
      } catch (error) {
        console.error('❌ Error creating payment intent:', error);
        setErrorMessage('Failed to initialize payment. Please try again.');
        onError('Failed to initialize payment');
      } finally {
        setIsLoading(false);
      }
    };

    if (stripe && amount > 0) {
      createPaymentIntent();
    }
  }, [stripe, amount, currency, instructionRef, onError]);

  // Update parent processing state
  useEffect(() => {
    onProcessingChange(isProcessing);
  }, [isProcessing, onProcessingChange]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment-success',
        },
        redirect: 'if_required'
      });

      if (error) {
        console.error('Payment error:', error);
        setErrorMessage(error.message || 'An error occurred during payment');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('✅ Payment succeeded:', paymentIntent.id);
        onSuccess(paymentIntent.id);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
      onError('Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="modern-payment-loading">
        <div className="loading-spinner" />
        <p>Initializing secure payment...</p>
      </div>
    );
  }

  return (
    <div className="modern-payment-form">
      <form onSubmit={handleSubmit} className="payment-form">
        
        {/* Payment Method Header */}
        <div className="payment-method-header">
          <div className="payment-icon">
            <FiCreditCard />
          </div>
          <div className="payment-title">
            <h4>Payment Method</h4>
            <p>Your payment information is secure and encrypted</p>
          </div>
          <div className="security-badge">
            <FiLock />
          </div>
        </div>

        {/* Stripe Payment Element */}
        {clientSecret && (
          <div className="payment-element-container">
            <PaymentElement
              options={{
                layout: 'tabs',
                paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
                fields: {
                  billingDetails: 'auto'
                }
              }}
              onChange={(event) => {
                setPaymentMethodSelected(event.complete);
                // Handle validation messages from Stripe
                setErrorMessage('');
              }}
            />
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="payment-error">
            <FiAlertCircle />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Payment Button */}
        <button
          type="submit"
          disabled={!stripe || !clientSecret || isProcessing || !paymentMethodSelected}
          className={`pay-button ${isProcessing ? 'processing' : ''}`}
        >
          {isProcessing ? (
            <>
              <div className="button-spinner" />
              Processing...
            </>
          ) : (
            <>
              <FiLock />
              Pay {formatAmount(amount * 1.2)}
            </>
          )}
        </button>

        {/* Security Notice */}
        <div className="security-notice">
          <FiShield />
          <span>Your payment is protected by 256-bit SSL encryption</span>
        </div>
      </form>
    </div>
  );
};

export default ModernPaymentForm;
