/**
 * Premium Checkout Component
 * 
 * World-class checkout experience for legal services
 * Replaces the existing Payment.tsx with a modern, trust-first approach
 */

import React, { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import './PremiumCheckout.css';

// Import existing components we'll enhance
import { PaymentForm } from './PaymentForm';
import { paymentService } from '../utils/paymentService';

interface PremiumCheckoutProps {
  // Core payment data
  amount: number;
  currency?: string;
  instructionRef: string;
  
  // Service details
  product: string;
  workType?: string;
  contactFirstName?: string;
  pitchedAt?: string;
  
  // Callbacks
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onBack?: () => void;
  
  // Legacy props for compatibility
  setIsComplete?: (complete: boolean) => void;
}

type CheckoutStep = 'summary' | 'payment' | 'success' | 'error';

const PremiumCheckout: React.FC<PremiumCheckoutProps> = ({
  amount,
  currency = 'gbp',
  instructionRef,
  product,
  workType,
  contactFirstName,
  pitchedAt,
  onSuccess,
  onError,
  onBack,
  setIsComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('summary');
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');

  // Initialize Stripe
  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const config = await paymentService.getConfig();
        const stripe = loadStripe(config.publishableKey);
        setStripePromise(stripe);
      } catch (error) {
        console.error('Failed to initialize Stripe:', error);
        setErrorMessage('Payment system unavailable. Please try again later.');
        setCurrentStep('error');
      }
    };

    initializeStripe();
  }, []);

  // Format amount for display
  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amt);
  };

  // Calculate expiry from pitch date
  const getExpiryText = () => {
    if (!pitchedAt) return '14 days';
    
    const pitchDate = new Date(pitchedAt);
    const expiry = new Date(pitchDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  };

  const handleProceedToPayment = () => {
    setCurrentStep('payment');
  };

  const handlePaymentSuccess = (paymentStatus: any) => {
    if (paymentStatus?.paymentId) {
      setPaymentReference(paymentStatus.paymentId);
    }
    setCurrentStep('success');
    setIsComplete?.(true);
    onSuccess?.();
  };

  const handlePaymentError = (error: string) => {
    setErrorMessage(error);
    setCurrentStep('error');
    onError?.(error);
  };

  const handleBack = () => {
    if (currentStep === 'payment') {
      setCurrentStep('summary');
    } else {
      onBack?.();
    }
  };

  // Step 1: Order Summary
  const renderSummaryStep = () => (
    <div className="premium-checkout__step premium-checkout__summary">
      <div className="premium-checkout__header">
        <h1 className="premium-checkout__title">Review Your Order</h1>
        <p className="premium-checkout__subtitle">
          Confirm your legal services details before proceeding to payment
        </p>
      </div>

      <div className="premium-checkout__service-card">
        <div className="service-details">
          <h2 className="service-title">{product}</h2>
          {workType && (
            <p className="service-type">{workType} matter</p>
          )}
          {contactFirstName && (
            <p className="service-solicitor">
              <span className="service-label">Solicitor:</span> {contactFirstName}
            </p>
          )}
        </div>

        <div className="service-pricing">
          <div className="price-display">
            <span className="price-amount">{formatAmount(amount)}</span>
            <span className="price-note">inc. VAT</span>
          </div>
          <div className="price-expiry">
            <span className="expiry-label">Quote expires in:</span>
            <span className="expiry-time">{getExpiryText()}</span>
          </div>
        </div>
      </div>

      <div className="premium-checkout__included">
        <h3>What's included:</h3>
        <ul>
          <li>Initial consultation and case assessment</li>
          <li>Document preparation and review</li>
          <li>Legal advice and recommendations</li>
          <li>Ongoing case management</li>
          {workType === 'Property' && <li>Property searches and due diligence</li>}
          {workType === 'Corporate' && <li>Company formation and compliance</li>}
        </ul>
      </div>

      <div className="premium-checkout__trust-strip">
        <div className="trust-indicators">
          <div className="trust-item">
            <span className="trust-icon">🔒</span>
            <span className="trust-text">Secure payment via Stripe</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">🏛️</span>
            <span className="trust-text">Helix Law Limited</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">📋</span>
            <span className="trust-text">Company No. 12345678</span>
          </div>
        </div>
        <div className="card-brands">
          <span className="card-brand">Visa</span>
          <span className="card-brand">Mastercard</span>
          <span className="card-brand">Amex</span>
        </div>
      </div>

      <div className="premium-checkout__actions">
        {onBack && (
          <button 
            type="button" 
            className="premium-checkout__btn premium-checkout__btn--secondary"
            onClick={handleBack}
          >
            Back
          </button>
        )}
        <button 
          type="button" 
          className="premium-checkout__btn premium-checkout__btn--primary"
          onClick={handleProceedToPayment}
        >
          Proceed to Secure Payment
        </button>
      </div>
    </div>
  );

  // Step 2: Payment with preflight
  const renderPaymentStep = () => (
    <div className="premium-checkout__step premium-checkout__payment">
      <div className="premium-checkout__header">
        <h1 className="premium-checkout__title">Secure Payment</h1>
        <p className="premium-checkout__subtitle">
          Complete your payment of {formatAmount(amount)}
        </p>
      </div>

      {stripePromise ? (
        <Elements stripe={stripePromise}>
          <div className="premium-checkout__payment-form">
            <PaymentForm
              amount={amount}
              currency={currency}
              instructionRef={instructionRef}
              metadata={{
                product,
                workType: workType || '',
                contactFirstName: contactFirstName || '',
                source: 'premium_checkout',
              }}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </div>
        </Elements>
      ) : (
        <div className="premium-checkout__loading">
          <div className="loading-spinner"></div>
          <p>Setting up secure payment session...</p>
        </div>
      )}

      <div className="premium-checkout__security-footer">
        <p className="security-notice">
          <span className="security-icon">🔒</span>
          Your payment details are encrypted and never stored by Helix Law
        </p>
        <p className="support-notice">
          Need help? Call us on <a href="tel:02071005555">020 7100 5555</a>
        </p>
      </div>

      <div className="premium-checkout__actions">
        <button 
          type="button" 
          className="premium-checkout__btn premium-checkout__btn--secondary"
          onClick={handleBack}
        >
          Back to Summary
        </button>
      </div>
    </div>
  );

  // Step 3: Success
  const renderSuccessStep = () => (
    <div className="premium-checkout__step premium-checkout__success">
      <div className="premium-checkout__result">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" width="64" height="64">
            <circle cx="12" cy="12" r="12" fill="#10B981"/>
            <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <h1 className="result-title">Payment Received</h1>
        <p className="result-message">
          Thank you for your payment of {formatAmount(amount)}. We'll begin work on your matter immediately.
        </p>

        <div className="result-details">
          <div className="detail-item">
            <span className="detail-label">Service:</span>
            <span className="detail-value">{product}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Amount paid:</span>
            <span className="detail-value">{formatAmount(amount)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Payment date:</span>
            <span className="detail-value">{new Date().toLocaleDateString('en-GB')}</span>
          </div>
          {paymentReference && (
            <div className="detail-item">
              <span className="detail-label">Reference:</span>
              <span className="detail-value">{paymentReference}</span>
            </div>
          )}
        </div>

        <div className="next-steps">
          <h3>What happens next:</h3>
          <ul>
            <li>Email confirmation sent to your registered address</li>
            <li>{contactFirstName || 'Your solicitor'} will contact you within 24 hours</li>
            <li>We'll request any additional documents if needed</li>
            <li>Your matter will be opened and work will begin</li>
          </ul>
        </div>
      </div>
    </div>
  );

  // Step 4: Error
  const renderErrorStep = () => (
    <div className="premium-checkout__step premium-checkout__error">
      <div className="premium-checkout__result">
        <div className="error-icon">
          <svg viewBox="0 0 24 24" width="64" height="64">
            <circle cx="12" cy="12" r="12" fill="#EF4444"/>
            <path d="m15 9-6 6m0-6 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <h1 className="result-title">Payment Failed</h1>
        <p className="result-message">{errorMessage}</p>

        <div className="error-actions">
          <button 
            type="button" 
            className="premium-checkout__btn premium-checkout__btn--primary"
            onClick={() => setCurrentStep('payment')}
          >
            Try Again
          </button>
          <button 
            type="button" 
            className="premium-checkout__btn premium-checkout__btn--secondary"
            onClick={() => setCurrentStep('summary')}
          >
            Back to Summary
          </button>
        </div>

        <div className="support-info">
          <h3>Need help?</h3>
          <p>
            Call us on <a href="tel:02071005555">020 7100 5555</a> or 
            email <a href="mailto:support@helixlaw.co.uk">support@helixlaw.co.uk</a>
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="premium-checkout">
      <div className="premium-checkout__container">
        <div className="premium-checkout__progress">
          <div className={`progress-step ${currentStep === 'summary' ? 'active' : ['payment', 'success', 'error'].includes(currentStep) ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Review</span>
          </div>
          <div className={`progress-step ${currentStep === 'payment' ? 'active' : ['success', 'error'].includes(currentStep) ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Payment</span>
          </div>
          <div className={`progress-step ${['success', 'error'].includes(currentStep) ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Complete</span>
          </div>
        </div>

        {currentStep === 'summary' && renderSummaryStep()}
        {currentStep === 'payment' && renderPaymentStep()}
        {currentStep === 'success' && renderSuccessStep()}
        {currentStep === 'error' && renderErrorStep()}
      </div>
    </div>
  );
};

export default PremiumCheckout;
