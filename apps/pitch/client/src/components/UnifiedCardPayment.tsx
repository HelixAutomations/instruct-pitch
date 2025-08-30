import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { paymentService } from '../utils/paymentService';

const stripePromise = loadStripe('pk_test_51NfS7uJaJqfqKGJL5pECRWcEOJ8O7kKbmN6tFCxZ5bRr9hOoqo1vX7ZfzBh4P8vLCtJfhJ8TfMwOz6WYO3GmR6F300Q6dD0nUt');

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#2d3748',
      '::placeholder': {
        color: '#a0aec0',
      },
      padding: '12px',
    },
    invalid: {
      color: '#e53e3e',
      iconColor: '#e53e3e'
    }
  },
  hidePostalCode: true,
};

interface UnifiedCardFormProps {
  clientSecret: string;
}

const UnifiedCardForm: React.FC<UnifiedCardFormProps> = ({ clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setMessage('Stripe not loaded');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setMessage('Card element not found');
      return;
    }

    setIsProcessing(true);
    setMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Test Customer',
            email: 'test@example.com',
          },
        }
      });

      if (error) {
        setMessage(`Payment failed: ${error.message}`);
        setPaymentResult({ error: error.message });
      } else {
        setMessage('Payment succeeded!');
        setPaymentResult({
          success: true,
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
          }
        });
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setPaymentResult({ error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="unified-payment-form">
      <div className="form-header">
        <h3>Unified Card Input</h3>
        <p>Single field with dynamic CVC and expiry reveal</p>
      </div>

      <form onSubmit={handleSubmit} className="payment-form">
        <div className="card-input-container">
          <label htmlFor="card-element">
            Card Details
          </label>
          <div className="card-element-wrapper">
            <CardElement 
              id="card-element"
              options={CARD_ELEMENT_OPTIONS}
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={!stripe || isProcessing}
          className="submit-button"
        >
          {isProcessing ? 'Processing...' : 'Pay £10.00'}
        </button>

        {message && (
          <div className={`message ${message.includes('succeeded') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {paymentResult && (
          <div className="payment-result">
            <h4>Payment Result:</h4>
            <pre>{JSON.stringify(paymentResult, null, 2)}</pre>
          </div>
        )}
      </form>
    </div>
  );
};

const UnifiedCardPayment: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const createPaymentIntent = async () => {
    // Use clientId from URL or generate a test ID
    const testClientId = clientId || `test-client-${Date.now()}`;

    setIsLoading(true);
    setError('');

    try {
      const response = await paymentService.createPaymentIntent({
        amount: 1000, // £10.00
        currency: 'gbp',
        instructionRef: `unified-test-${testClientId}`,
        metadata: {
          description: 'Unified Card Payment Test',
          clientId: testClientId,
          source: 'admin-workbench'
        }
      });

      if (response.clientSecret) {
        setClientSecret(response.clientSecret);
      } else {
        setError('No client secret received');
      }
    } catch (err) {
      setError(`Failed to create payment intent: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPayment = () => {
    setClientSecret('');
    setError('');
  };

  return (
    <div className="unified-card-payment">
      <div className="unified-header">
        <h2>Unified Card Payment</h2>
        <p>Simplified single-field card input with Stripe CardElement</p>
      </div>

      {!clientSecret ? (
        <div className="setup-section">
          <button 
            onClick={createPaymentIntent}
            disabled={isLoading}
            className="create-button"
          >
            {isLoading ? 'Creating Payment...' : 'Create Payment Intent'}
          </button>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="payment-section">
          <Elements stripe={stripePromise}>
            <UnifiedCardForm clientSecret={clientSecret} />
          </Elements>
          
          <button 
            onClick={resetPayment}
            className="reset-button"
          >
            Reset Payment
          </button>
        </div>
      )}
    </div>
  );
};

export default UnifiedCardPayment;
