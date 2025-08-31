import React, { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import { FiLock, FiAlertCircle, FiCreditCard, FiBriefcase } from 'react-icons/fi';
import { FaApple, FaGoogle } from 'react-icons/fa';
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
  const [cardComplete, setCardComplete] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [activePaymentMethod, setActivePaymentMethod] = useState<'card' | 'bank'>('card');

  // Card element options for clean, simplified styling
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        color: '#2d3748',
        '::placeholder': {
          color: '#a0aec0',
        },
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

  // Setup Apple Pay payment request
  useEffect(() => {
    if (stripe && amount > 0) {
      console.log('🍎 Setting up Apple Pay payment request...');
      
      const pr = stripe.paymentRequest({
        country: 'GB',
        currency: currency.toLowerCase(),
        total: {
          label: 'Legal Services',
          amount: Math.round(amount * 1.2 * 100), // Convert to pence and add VAT
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      // Check if Apple Pay is available
      pr.canMakePayment().then((result) => {
        console.log('🍎 Apple Pay availability check:', result);
        if (result) {
          console.log('✅ Apple Pay is available');
          setPaymentRequest(pr);
        } else {
          console.log('❌ Apple Pay not available on this device/browser');
        }
      }).catch((error) => {
        console.log('❌ Apple Pay check failed:', error);
      });

      pr.on('paymentmethod', async (event) => {
        console.log('🍎 Apple Pay payment method selected');
        try {
          if (!clientSecret) {
            console.error('❌ No client secret available for Apple Pay');
            event.complete('fail');
            return;
          }

          const { error, paymentIntent } = await stripe.confirmCardPayment(
            clientSecret,
            {
              payment_method: event.paymentMethod.id
            },
            { handleActions: false }
          );

          if (error) {
            console.error('❌ Apple Pay confirmation error:', error);
            event.complete('fail');
            setErrorMessage(error.message || 'Apple Pay payment failed');
          } else {
            console.log('✅ Apple Pay payment succeeded');
            event.complete('success');
            if (paymentIntent && paymentIntent.status === 'succeeded') {
              onSuccess(paymentIntent.id);
            }
          }
        } catch (error) {
          console.error('❌ Apple Pay processing error:', error);
          event.complete('fail');
          setErrorMessage('Apple Pay payment failed');
        }
      });
    }
  }, [stripe, amount, currency, clientSecret, onSuccess]);

  // Update parent processing state
  useEffect(() => {
    onProcessingChange(isProcessing);
  }, [isProcessing, onProcessingChange]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setErrorMessage('Card element not found');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Payment on Account of Costs',
          }
        }
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

  const handleCardElementChange = (event: any) => {
    setCardComplete(event.complete);
    
    // Clear errors when user is typing
    if (errorMessage && event.complete !== undefined) {
      setErrorMessage('');
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
        
        {/* Payment Method Tabs */}
        <div className="payment-methods-tabs">
          <button
            type="button"
            className={`payment-tab ${activePaymentMethod === 'card' ? 'active' : ''}`}
            onClick={() => setActivePaymentMethod('card')}
          >
            <FiCreditCard />
            Card
          </button>
          <button
            type="button"
            className={`payment-tab ${activePaymentMethod === 'bank' ? 'active' : ''}`}
            onClick={() => setActivePaymentMethod('bank')}
          >
            <FiBriefcase />
            Bank Transfer
          </button>
        </div>

        {/* Digital Wallets */}
        {activePaymentMethod === 'card' && (
          <div className="digital-wallets">
            {paymentRequest ? (
              <PaymentRequestButtonElement
                options={{
                  paymentRequest,
                  style: {
                    paymentRequestButton: {
                      type: 'default',
                      theme: 'dark',
                      height: '48px',
                    },
                  },
                }}
              />
            ) : (
              <>
                <button type="button" className="wallet-button apple-pay" disabled>
                  <FaApple />
                  Apple Pay
                </button>
                <button type="button" className="wallet-button google-pay" disabled>
                  <FaGoogle />
                  Google Pay
                </button>
              </>
            )}
            
            <div className="payment-method-divider">
              <span>or pay with card</span>
            </div>
          </div>
        )}

        {/* Bank Transfer Instructions */}
        {activePaymentMethod === 'bank' && (
          <div className="bank-transfer-section">
            <div className="bank-instructions">
              <h4>Bank Transfer Details</h4>
              <div className="bank-details">
                <div className="bank-detail">
                  <strong>Account Name:</strong> Helix Legal Solutions Ltd
                </div>
                <div className="bank-detail">
                  <strong>Sort Code:</strong> 04-00-04
                </div>
                <div className="bank-detail">
                  <strong>Account Number:</strong> 12345678
                </div>
                <div className="bank-detail">
                  <strong>Reference:</strong> {instructionRef}
                </div>
                <div className="bank-detail">
                  <strong>Amount:</strong> {formatAmount(amount * 1.2)}
                </div>
              </div>
              <p className="bank-note">
                Please use the reference number above when making your transfer.
                Payment processing may take 1-3 business days.
              </p>
            </div>
          </div>
        )}

        {/* Card Input Element */}
        {activePaymentMethod === 'card' && clientSecret && (
          <div className="payment-element-container">
            <div className="payment-element-wrapper">
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
            </div>
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
        {activePaymentMethod === 'card' ? (
          <button
            type="submit"
            disabled={!stripe || !clientSecret || isProcessing || !cardComplete}
            className={`pay-button ${isProcessing ? 'processing' : ''} ${cardComplete ? 'ready' : 'pending'}`}
          >
            {isProcessing ? (
              <>
                <div className="button-spinner" />
                Processing Payment...
              </>
            ) : (
              <>
                <FiLock />
                Pay {formatAmount(amount * 1.2)}
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSuccess('bank-transfer-pending')}
            className="pay-button bank-transfer-button"
          >
            <FiBriefcase />
            Confirm Bank Transfer Details
          </button>
        )}
      </form>

      <style>{`
        .modern-payment-form {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }

        .payment-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
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

        .apple-pay-container {
          margin-bottom: 1.5rem;
        }

        .apple-pay-note {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          text-align: center;
        }

        .apple-pay-note p {
          margin: 0;
          color: #64748b;
          font-size: 0.875rem;
        }

        .payment-divider {
          display: flex;
          align-items: center;
          margin: 1.5rem 0;
          text-align: center;
        }

        .payment-divider::before,
        .payment-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .payment-divider span {
          padding: 0 1rem;
          color: #64748b;
          font-size: 0.875rem;
          background: white;
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

        .pay-button {
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

        .pay-button:hover:not(:disabled) {
          background: #061733;
          transform: translateY(-1px);
        }

        .pay-button:active {
          transform: translateY(0);
        }

        .pay-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .pay-button.processing {
          background: #0D2F60;
          opacity: 0.8;
        }

        .pay-button.ready {
          background: #059669;
        }

        .pay-button.ready:hover:not(:disabled) {
          background: #047857;
          transform: translateY(-1px);
        }

        .button-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .modern-payment-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .payment-element-wrapper {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ModernPaymentForm;
