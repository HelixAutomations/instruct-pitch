/**
 * Payment Example Component
 * 
 * Demonstrates how to use the PaymentForm and PaymentStatus components
 */

import React, { useState } from 'react';
import { PaymentForm } from './PaymentForm';
import { PaymentStatus } from './PaymentStatus';
import { PaymentStatus as PaymentStatusType } from '../utils/paymentService';

interface PaymentExampleProps {
  instructionRef: string;
  amount?: number;
  currency?: string;
  onSuccess?: (payment: PaymentStatusType) => void;
  onError?: (error: string) => void;
}

export const PaymentExample: React.FC<PaymentExampleProps> = ({
  instructionRef,
  amount = 500, // Default £500
  currency = 'gbp',
  onSuccess,
  onError,
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
      <PaymentForm
        amount={amount}
        currency={currency}
        instructionRef={instructionRef}
        metadata={{
          source: 'instruction_portal',
          timestamp: new Date().toISOString(),
        }}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
};
