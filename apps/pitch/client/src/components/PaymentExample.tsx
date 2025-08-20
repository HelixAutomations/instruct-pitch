/**
 * Payment Example Component
 * 
 * Demonstrates how to use the PaymentForm and PaymentStatus components
 */

import React, { useState } from 'react';
import { PaymentForm } from './PaymentForm';
import { PaymentStatus } from './PaymentStatus';
import { paymentService } from '../utils/paymentService';
import { PaymentStatus as PaymentStatusType } from '../utils/paymentService';

interface PaymentExampleProps {
  instructionRef: string;
  amount?: number;
  currency?: string;
  onSuccess?: (payment: PaymentStatusType) => void;
  onError?: (error: string) => void;
  passcode?: string;
  product?: string;
  workType?: string;
}

export const PaymentExample: React.FC<PaymentExampleProps> = ({
  instructionRef,
  amount = 500, // Default £500
  currency = 'gbp',
  onSuccess,
  onError,
  passcode,
  product,
  workType,
}) => {
  const [currentPaymentId, setCurrentPaymentId] = useState<string>('');
  const [showStatus, setShowStatus] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const handlePaymentSuccess = (payment: PaymentStatusType) => {
    console.log('Payment completed successfully:', payment);
    setCurrentPaymentId(payment.paymentId);
    setShowStatus(true);
    setPaymentCompleted(true);
    
    // Call the parent callback if provided
    if (onSuccess) {
      onSuccess(payment);
    }
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment failed:', error);
    
    // Call the parent callback if provided
    if (onError) {
      onError(error);
    }
  };

  const handleStatusUpdate = (status: PaymentStatusType) => {
    console.log('Payment status update:', status);
    setCurrentPaymentId(status.paymentId);
    setShowStatus(true);
  };

  const resetPayment = () => {
    setCurrentPaymentId('');
    setShowStatus(false);
    setPaymentCompleted(false);
  };

  if (showStatus && currentPaymentId) {
    // For preview payments, show simple success instead of polling status
    if (import.meta.env && import.meta.env.DEV && passcode === '20200' && currentPaymentId.startsWith('preview-')) {
      return (
        <div className="payment-example">
          <div className="payment-form status status--success">
            <div className="payment-form__status">
              <h3>Payment Completed</h3>
              <p className="status-text">Preview payment completed successfully</p>
              <div className="payment-details">
                <p><strong>Amount:</strong> {paymentService.formatAmount(amount || 0, currency)}</p>
                <p><strong>Service:</strong> {product || 'Preview Service'}</p>
                {workType && <p><strong>Work Type:</strong> {workType}</p>}
              </div>
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button onClick={resetPayment} className="btn secondary">
                  Make Another Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="payment-example">
        <PaymentStatus
          paymentId={currentPaymentId}
          autoRefresh={!paymentCompleted}
          refreshInterval={3000}
          onStatusChange={handleStatusUpdate}
        />
        
        {paymentCompleted && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button onClick={resetPayment} className="secondary-button">
              Make Another Payment
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="payment-example">
      {/* If running locally with the test passcode and amount is zero, show preview Pay flow */}
      {import.meta.env && import.meta.env.DEV && passcode === '20200' && (!amount || amount <= 0) ? (
        <div className="payment-form preview">
          <div className="payment-form__header">
            <h3>Payment Details</h3>
            <div className="payment-amount">{paymentService.formatAmount(amount, currency)}</div>
          </div>
          <div className="payment-form__service">
            <div className="service-description">
              {product && <div><strong>Service:</strong> {product}</div>}
              {workType && <div><strong>Work Type:</strong> {workType}</div>}
            </div>
          </div>
          <div className="payment-form__form">
            <button
              type="button"
              className="payment-form__submit"
              onClick={() => {
                console.log('Preview payment clicked - simulating success');
                
                // simulate a successful payment for preview - skip status polling
                const mock: PaymentStatusType = {
                  paymentId: `preview-${Date.now()}`,
                  paymentStatus: 'succeeded',
                  internalStatus: 'completed',
                  amount: amount || 0,
                  currency: currency,
                  instructionRef: instructionRef,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  webhookEvents: [],
                } as any;
                
                // Set local state to completed
                setPaymentCompleted(true);
                setCurrentPaymentId(mock.paymentId);
                setShowStatus(true);
                
                // Call parent success callback
                if (onSuccess) {
                  console.log('Calling onSuccess callback');
                  onSuccess(mock);
                }
              }}
            >
              Pay {paymentService.formatAmount(amount, currency)} (Preview)
            </button>
          </div>
        </div>
      ) : (
        <PaymentForm
          amount={amount}
          currency={currency}
          instructionRef={instructionRef}
          // Stable metadata: timestamp only generated once
          metadata={React.useMemo(() => ({
            source: 'instruction_portal',
            // Provide createdAt once; PaymentForm no longer depends on metadata so this is safe
            createdAt: new Date().toISOString(),
          // eslint-disable-next-line react-hooks/exhaustive-deps
          }), [instructionRef])}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
};
