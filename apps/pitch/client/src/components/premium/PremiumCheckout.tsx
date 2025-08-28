import React, { useState } from 'react';
import { useClient } from '../../context/ClientContext';
import PaymentSummaryMinimal from './PaymentSummaryMinimal';
import OrderSummaryMinimal from './OrderSummaryMinimal';
import ModernPaymentForm from './ModernPaymentForm';
import PaymentReceipt from './PaymentReceipt';
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
      {/* Step 1: Payment Summary with Morphing Preflight */}
      {(currentStep === 'summary' || currentStep === 'preflight') && (
        <PaymentSummaryMinimal
          dealData={{
            Amount: dealData.Amount || 0,
            ServiceDescription: dealData.ServiceDescription || 'Legal Services',
            InstructionRef: dealData.InstructionRef,
            ProspectId: dealData.ProspectId,
            SolicitorName: dealData.SolicitorName,
            SolicitorTitle: dealData.SolicitorTitle,
            SolicitorEmail: dealData.SolicitorEmail,
            SolicitorPhone: dealData.SolicitorPhone
          }}
          onProceedToPayment={() => setCurrentStep('preflight')}
          showPreflight={currentStep === 'preflight'}
          onPreflightComplete={() => setCurrentStep('payment')}
        />
      )}

      {/* Step 2: Main Checkout Flow */}
      {(currentStep === 'payment' || currentStep === 'processing' || currentStep === 'receipt') && (
        <>
          {/* Order Summary - Direct child of premium-checkout */}
          <OrderSummaryMinimal
            dealData={{
              Amount: dealData.Amount || 0,
              ServiceDescription: dealData.ServiceDescription || 'Legal Services',
              InstructionRef: dealData.InstructionRef,
              ProspectId: dealData.ProspectId
            }}
            isProcessing={currentStep === 'processing'}
          />

          {/* Payment Details - Direct child of premium-checkout */}
          {currentStep === 'payment' && (
            <div className="payment-section-minimal">
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
        </>
      )}
    </div>
  );
};

export default PremiumCheckout;
