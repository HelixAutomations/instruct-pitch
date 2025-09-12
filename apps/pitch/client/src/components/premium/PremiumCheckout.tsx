import React, { useState } from 'react';
import { useClient } from '../../context/ClientContext';
import PaymentSummaryMinimal from './PaymentSummaryMinimal';
import OrderSummaryMinimal from './OrderSummaryMinimal';
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
  const { dealData, setDealData } = useClient();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('summary');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  // Track any user-edited subtotal (pre-VAT) chosen in the summary step
  const [selectedSubtotal, setSelectedSubtotal] = useState<number | null>(null);

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
            Amount: (selectedSubtotal ?? dealData.Amount) || 0,
            ServiceDescription: dealData.ServiceDescription || 'Legal Services',
            InstructionRef: dealData.InstructionRef,
            ProspectId: dealData.ProspectId,
            SolicitorName: dealData.SolicitorName,
            SolicitorTitle: dealData.SolicitorTitle,
            SolicitorEmail: dealData.SolicitorEmail,
            SolicitorPhone: dealData.SolicitorPhone
          }}
          onProceedToPayment={(chosenSubtotal) => {
            setSelectedSubtotal(chosenSubtotal);
            // Persist into global context so any downstream consumer uses the edited amount
            if (dealData) {
              setDealData({ ...dealData, Amount: chosenSubtotal });
            }
            setCurrentStep('preflight');
          }}
          showPreflight={currentStep === 'preflight'}
          onPreflightComplete={() => setCurrentStep('payment')}
        />
      )}

      {/* Step 2: Main Checkout Flow */}
      {(currentStep === 'payment' || currentStep === 'processing' || currentStep === 'receipt') && (
        <>
          {/* Order Summary with integrated payment form */}
          <OrderSummaryMinimal
            dealData={{
              Amount: (selectedSubtotal ?? dealData.Amount) || 0,
              ServiceDescription: dealData.ServiceDescription || 'Legal Services',
              InstructionRef: dealData.InstructionRef,
              ProspectId: dealData.ProspectId
            }}
            isProcessing={currentStep === 'processing'}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />

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
                Amount: (selectedSubtotal ?? dealData.Amount) || 0,
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
