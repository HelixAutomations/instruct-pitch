import React, { useState } from 'react';
import { useClient } from '../../context/ClientContext';
import PaymentSummary from './PaymentSummary';
import OrderSummary from './OrderSummary';
import ModernPaymentForm from './ModernPaymentForm';
import PaymentReceipt from './PaymentReceipt';
import PreflightExperience from './PreflightExperience';
import './premiumCheckout.css';

interface PremiumCheckoutProps {
  instructionRef: string;
  onComplete?: () => void;
}

type CheckoutStep = 'summary' | 'preflight' | 'payment' | 'processing' | 'receipt';

const PremiumCheckout: React.FC<PremiumCheckoutProps> = ({
  instructionRef,
  onComplete
}) => {
  const { dealData } = useClient();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('summary');
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // Ensure we have deal data before rendering payment
  if (!dealData || !dealData.Amount) {
    return (
      <div className="premium-checkout">
        <div className="checkout-loading">
          <div className="loading-spinner" />
          <p>Loading checkout...</p>
        </div>
      </div>
    );
  }

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setPaymentId(paymentIntentId);
    setCurrentStep('receipt');
    onComplete?.();
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    // Stay on payment step to allow retry
  };

  const handleReturnToPayment = () => {
    setCurrentStep('payment');
    setPaymentId(null);
  };

  return (
    <div className="premium-checkout">
      {/* Step 1: Payment Summary */}
      {currentStep === 'summary' && (
        <PaymentSummary
          dealData={{
            Amount: dealData.Amount || 0,
            ServiceDescription: dealData.ServiceDescription || 'Legal Services',
            InstructionRef: dealData.InstructionRef,
            ProspectId: dealData.ProspectId
          }}
          instructionRef={instructionRef}
          onProceedToPayment={() => setCurrentStep('preflight')}
        />
      )}

      {/* Step 2: Preflight Experience */}
      {currentStep === 'preflight' && (
        <PreflightExperience
          amount={dealData.Amount || 0}
          instructionRef={instructionRef}
          onComplete={() => setCurrentStep('payment')}
        />
      )}

      {/* Step 3: Main Checkout Flow */}
      {(currentStep === 'payment' || currentStep === 'processing' || currentStep === 'receipt') && (
        <div className="checkout-container">
          
          {/* Left Panel - Order Summary */}
          <div className="checkout-sidebar">
            <OrderSummary
              dealData={{
                Amount: dealData.Amount || 0,
                ServiceDescription: dealData.ServiceDescription || 'Legal Services',
                InstructionRef: dealData.InstructionRef,
                ProspectId: dealData.ProspectId
              }}
              instructionRef={instructionRef}
              isProcessing={currentStep === 'processing'}
            />
          </div>

          {/* Right Panel - Payment Form or Receipt */}
          <div className="checkout-main">
            {currentStep === 'payment' && (
              <div className="payment-section">
                <div className="section-header">
                  <h2>Payment Details</h2>
                  <p>Complete your secure payment to proceed</p>
                </div>
                
                <ModernPaymentForm
                  amount={dealData.Amount || 0}
                  currency="gbp"
                  instructionRef={instructionRef}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onProcessingChange={() => {}}
                />
              </div>
            )}

            {currentStep === 'processing' && (
              <div className="processing-section">
                <div className="processing-content">
                  <div className="processing-spinner" />
                  <h3>Processing Payment</h3>
                  <p>Please wait while we process your payment securely...</p>
                </div>
              </div>
            )}

            {currentStep === 'receipt' && paymentId && (
              <PaymentReceipt
                paymentId={paymentId}
                dealData={{
                  Amount: dealData.Amount || 0,
                  ServiceDescription: dealData.ServiceDescription || 'Legal Services',
                  InstructionRef: dealData.InstructionRef,
                  ProspectId: dealData.ProspectId
                }}
                instructionRef={instructionRef}
                onNewPayment={handleReturnToPayment}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumCheckout;
