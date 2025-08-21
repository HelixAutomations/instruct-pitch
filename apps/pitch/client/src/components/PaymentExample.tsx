/**
 * Payment Example Component - iPhone Case Checkout Inspired
 * 
 * Clean, premium payment experience for legal services
 * Follows the design principles from iPhone case checkout cleanness
 */

import React, { useState } from 'react';
import { PaymentForm } from './PaymentForm';
import { PaymentStatus } from './PaymentStatus';
import { paymentService } from '../utils/paymentService';
import { PaymentStatus as PaymentStatusType } from '../utils/paymentService';
import { useClient } from '../context/ClientContext';
import './PaymentExample.css';

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
  amount,
  currency = 'gbp',
  onSuccess,
  onError,
  passcode,
  product,
  workType,
}) => {
  // Get deal data from context to determine the actual payment amount
  const { dealData } = useClient();
  
  // Use amount from deal data if available, otherwise fall back to prop
  const paymentAmount = dealData?.Amount || amount || 1000; // Default £1000 instead of £500
  
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
    // For preview payments, show clean success state
    if (import.meta.env && import.meta.env.DEV && passcode === '20200' && currentPaymentId.startsWith('preview-')) {
      return (
        <div className="premium-payment-container">
          <div className="payment-success-card">
            <div className="success-icon">✓</div>
            <h2>Payment Received</h2>
            <p className="success-message">Thank you for your payment of {paymentService.formatAmount(paymentAmount, currency)}</p>
            
            <div className="receipt-details">
              <div className="receipt-header">
                <h3>Receipt</h3>
                <div className="receipt-id">#{currentPaymentId.split('-')[1]}</div>
              </div>
              
              <div className="receipt-summary">
                <div className="receipt-line">
                  <span>Legal consultation</span>
                  <span>{paymentService.formatAmount(paymentAmount, currency)}</span>
                </div>
                {workType && (
                  <div className="receipt-line secondary">
                    <span>{workType} matter</span>
                    <span>Included</span>
                  </div>
                )}
                <div className="receipt-line">
                  <span>Processing fee</span>
                  <span>£0.00</span>
                </div>
                <div className="receipt-total">
                  <span>Total paid</span>
                  <span>{paymentService.formatAmount(paymentAmount, currency)}</span>
                </div>
              </div>
              
              <div className="receipt-footer">
                <div className="receipt-info">
                  <p><strong>Payment method:</strong> Test payment</p>
                  <p><strong>Transaction ID:</strong> {currentPaymentId}</p>
                  <p><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            </div>
            
            <div className="action-buttons">
              <button onClick={resetPayment} className="secondary-button">
                Make Another Payment
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="premium-payment-container">
        <div className="payment-status-card">
          <PaymentStatus
            paymentId={currentPaymentId}
            autoRefresh={!paymentCompleted}
            refreshInterval={3000}
            onStatusChange={handleStatusUpdate}
          />
          
          {paymentCompleted && (
            <div className="action-buttons">
              <button onClick={resetPayment} className="secondary-button">
                Make Another Payment
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="premium-payment-container">
      {/* Typeform-like clean interface */}
      
      {/* If running locally with test passcode, show simplified preview */}
      {import.meta.env && import.meta.env.DEV && passcode === '20200' && (!paymentAmount || paymentAmount <= 0) ? (
        <div className="payment-preview-card">
          <div className="order-summary">
            <h2>Legal Services</h2>
            <div className="service-details">
              <p>Professional legal consultation and document preparation</p>
              {workType && <p className="work-type">Area: {workType}</p>}
            </div>
            
            <div className="receipt-summary">
              <div className="receipt-line">
                <span>Legal consultation</span>
                <span>{paymentService.formatAmount(paymentAmount, currency)}</span>
              </div>
              {workType && (
                <div className="receipt-line secondary">
                  <span>{workType} matter</span>
                  <span>Included</span>
                </div>
              )}
              <div className="receipt-total">
                <span>Total</span>
                <span>{paymentService.formatAmount(paymentAmount, currency)}</span>
              </div>
            </div>
          </div>
          
          <div className="payment-action">
            <button
              type="button"
              className="premium-pay-button"
              onClick={() => {
                console.log('Preview payment - simulating success');
                
                const mockPayment: PaymentStatusType = {
                  paymentId: `preview-${Date.now()}`,
                  paymentStatus: 'succeeded',
                  internalStatus: 'completed',
                  amount: paymentAmount,
                  currency: currency,
                  instructionRef: instructionRef,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  webhookEvents: [],
                } as any;
                
                setPaymentCompleted(true);
                setCurrentPaymentId(mockPayment.paymentId);
                setShowStatus(true);
                
                if (onSuccess) {
                  onSuccess(mockPayment);
                }
              }}
            >
              Complete Payment {paymentService.formatAmount(paymentAmount, currency)}
            </button>
            <div className="trust-indicators">
              Secure payment • 256-bit encryption
            </div>
          </div>
        </div>
      ) : (
        /* Clean Stripe Payment Form - Typeform inspired */
        <div className="premium-payment-card">
          <div className="checkout-header">
            <h2>Complete your order</h2>
            <div className="order-total">{paymentService.formatAmount(paymentAmount, currency)}</div>
          </div>
          
          <div className="order-summary-minimal">
            <div className="service-item">
              <span className="service-name">{product || 'Legal Services'}</span>
              <span className="service-price">{paymentService.formatAmount(paymentAmount, currency)}</span>
            </div>
            {workType && (
              <div className="service-details-line">
                <span>{workType} matter</span>
              </div>
            )}
          </div>
          
          <PaymentForm
            amount={paymentAmount}
            currency={currency}
            instructionRef={instructionRef}
            metadata={React.useMemo(() => ({
              source: 'premium_legal_services',
              service_type: product || 'Legal Consultation',
              work_area: workType || 'General',
              createdAt: new Date().toISOString(),
            }), [instructionRef, product, workType])}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onStatusUpdate={handleStatusUpdate}
          />
        </div>
      )}
    </div>
  );
};
