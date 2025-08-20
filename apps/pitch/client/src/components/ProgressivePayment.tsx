/**
 * Progressive Payment Enhancement Component
 * 
 * Provides increasingly sophisticated payment experiences based on user interaction
 */

import React, { useState } from 'react';
import { InlinePaymentFlow } from './InlinePaymentFlow';
import { PaymentStatus } from '../utils/paymentService';
import './ProgressivePayment.css';

interface ProgressivePaymentProps {
  amount: number;
  currency?: string;
  instructionRef: string;
  metadata?: Record<string, any>;
  onSuccess?: (payment: PaymentStatus) => void;
  onError?: (error: string) => void;
  triggerText?: string;
  showPreview?: boolean;
}

export const ProgressivePayment: React.FC<ProgressivePaymentProps> = ({
  amount,
  currency = 'gbp',
  instructionRef,
  metadata = {},
  onSuccess,
  onError,
  triggerText = 'Complete Payment',
  showPreview = true,
}) => {
  const [stage, setStage] = useState<'preview' | 'inline' | 'complete'>('preview');
  const [isExpanded, setIsExpanded] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const formatAmount = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const handleStartPayment = () => {
    setStage('inline');
    setIsExpanded(true);
  };

  const handlePaymentSuccess = (payment: PaymentStatus) => {
    setPaymentCompleted(true);
    setStage('complete');
    if (onSuccess) {
      onSuccess(payment);
    }
  };

  const handlePaymentError = (error: string) => {
    if (onError) {
      onError(error);
    }
  };

  const handleCancel = () => {
    setStage('preview');
    setIsExpanded(false);
  };

  // Preview Stage - Shows payment summary with trigger button
  if (stage === 'preview' && showPreview) {
    return (
      <div className="progressive-payment preview-stage">
        <div className="payment-preview">
          <div className="preview-header">
            <h3>Payment Required</h3>
            <div className="preview-amount">
              {formatAmount(amount, currency)}
            </div>
          </div>
          
          <div className="preview-details">
            <div className="detail-row">
              <span className="label">Amount:</span>
              <span className="value">{formatAmount(amount, currency)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Currency:</span>
              <span className="value">{currency.toUpperCase()}</span>
            </div>
            <div className="detail-row">
              <span className="label">Payment Method:</span>
              <span className="value">Card • Bank • Wallet</span>
            </div>
          </div>

          <button 
            className="start-payment-button"
            onClick={handleStartPayment}
          >
            <span className="button-icon">💳</span>
            {triggerText}
          </button>

          <div className="security-badge">
            <span className="badge-icon">🛡️</span>
            <span>256-bit SSL encryption</span>
          </div>
        </div>
      </div>
    );
  }

  // Inline Stage - Shows full payment form
  if (stage === 'inline') {
    return (
      <div className={`progressive-payment inline-stage ${isExpanded ? 'expanded' : ''}`}>
        <InlinePaymentFlow
          amount={amount}
          currency={currency}
          instructionRef={instructionRef}
          metadata={{
            ...metadata,
            progressive_payment: true,
          }}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onCancel={handleCancel}
          showAmount={true}
          compact={false}
        />
      </div>
    );
  }

  // Complete Stage - Shows success message
  if (stage === 'complete' && paymentCompleted) {
    return (
      <div className="progressive-payment complete-stage">
        <div className="completion-message">
          <div className="success-animation">
            <div className="checkmark">✓</div>
          </div>
          <h3>Payment Complete!</h3>
          <p className="completion-amount">
            {formatAmount(amount, currency)} processed successfully
          </p>
          <p className="completion-note">
            You will receive a confirmation email shortly
          </p>
        </div>
      </div>
    );
  }

  // Fallback to direct inline payment
  return (
    <div className="progressive-payment direct-stage">
      <InlinePaymentFlow
        amount={amount}
        currency={currency}
        instructionRef={instructionRef}
        metadata={metadata}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        showAmount={true}
        compact={false}
      />
    </div>
  );
};
